import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, webhook-id, webhook-signature, webhook-timestamp",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};


/* =========================================================
   HELPERS
========================================================= */

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );
}


/* =========================================================
   WEBHOOK SIGNATURE
========================================================= */

async function verifyWebhookSignature(
  payload: string,
  webhookId: string,
  webhookTimestamp: string,
  webhookSignature: string,
  secret: string
) {

  const signedContent =
    `${webhookId}.${webhookTimestamp}.${payload}`;


  const encoder =
    new TextEncoder();


  /*
   * Dodo uses the Standard Webhooks signing-secret format.
   * The value after "whsec_" is Base64 encoded and must be
   * decoded before it is used as the HMAC key.
   */
  const encodedSecret =
    secret.startsWith("whsec_")
      ? secret.slice(6)
      : secret;


  const normalizedSecret =
    encodedSecret
      .replace(/-/g, "+")
      .replace(/_/g, "/");


  const paddedSecret =
    normalizedSecret.padEnd(
      Math.ceil(normalizedSecret.length / 4) * 4,
      "="
    );


  const keyData =
    Uint8Array.from(
      atob(paddedSecret),
      (character) =>
        character.charCodeAt(0)
    );


  const cryptoKey =
    await crypto.subtle.importKey(
      "raw",
      keyData,
      {
        name: "HMAC",
        hash: "SHA-256",
      },
      false,
      ["sign"]
    );


  const signatureBytes =
    await crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      encoder.encode(
        signedContent
      )
    );


  const expectedSignature =
    btoa(
      String.fromCharCode(
        ...new Uint8Array(
          signatureBytes
        )
      )
    );


  /*
   * Dodo sends signatures in the form:
   *
   * v1,<base64-signature>
   *
   * There can potentially be multiple
   * signatures separated by spaces.
   */

  const suppliedSignatures =
    webhookSignature
      .split(" ")
      .map((item) => {

        const parts =
          item.split(",");

        return parts.length === 2
          ? parts[1]
          : item;

      });


  return suppliedSignatures.includes(
    expectedSignature
  );
}


/* =========================================================
   EMAIL + DISCORD NOTIFICATIONS
========================================================= */

async function sendConsultationNotifications(
  supabaseUrl: string,
  serviceRoleKey: string,
  record: Record<string, unknown>
) {

  const response =
    await fetch(
      `${supabaseUrl}/functions/v1/send-consultation-email`,
      {
        method: "POST",
        headers: {
          "Authorization":
            `Bearer ${serviceRoleKey}`,
          "apikey":
            serviceRoleKey,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          record,
        }),
      }
    );


  const responseText =
    await response.text();


  if (!response.ok) {
    throw new Error(
      `send-consultation-email failed (${response.status}): ${responseText}`
    );
  }


  console.log(
    "Consultation email and Discord notification sent:",
    record.id
  );
}


/* =========================================================
   MAIN
========================================================= */

Deno.serve(async (req) => {

  /* -------------------------------------------------------
     CORS
  ------------------------------------------------------- */

  if (req.method === "OPTIONS") {
    return new Response(
      "ok",
      {
        headers: corsHeaders,
      }
    );
  }


  if (req.method !== "POST") {
    return jsonResponse(
      {
        success: false,
        error: "Method not allowed.",
      },
      405
    );
  }


  try {

    /* -----------------------------------------------------
       ENVIRONMENT
    ----------------------------------------------------- */

    const supabaseUrl =
      Deno.env.get(
        "SUPABASE_URL"
      );

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY"
      );

    const webhookSecret =
      Deno.env.get(
        "DODO_WEBHOOK_SECRET"
      );


    if (
      !supabaseUrl ||
      !serviceRoleKey ||
      !webhookSecret
    ) {

      console.error(
        "Missing webhook environment variables."
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Webhook server configuration is incomplete.",
        },
        500
      );
    }


    /* -----------------------------------------------------
       WEBHOOK HEADERS
    ----------------------------------------------------- */

    const webhookId =
      req.headers.get(
        "webhook-id"
      );

    const webhookTimestamp =
      req.headers.get(
        "webhook-timestamp"
      );

    const webhookSignature =
      req.headers.get(
        "webhook-signature"
      );


    if (
      !webhookId ||
      !webhookTimestamp ||
      !webhookSignature
    ) {

      console.error(
        "Missing Dodo webhook headers."
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Missing webhook signature headers.",
        },
        400
      );
    }


    /* -----------------------------------------------------
       READ RAW BODY
       
       IMPORTANT:
       Signature must be calculated against
       the exact raw request body.
    ----------------------------------------------------- */

    const rawBody =
      await req.text();


    /* -----------------------------------------------------
       VERIFY SIGNATURE
    ----------------------------------------------------- */

    const signatureValid =
      await verifyWebhookSignature(
        rawBody,
        webhookId,
        webhookTimestamp,
        webhookSignature,
        webhookSecret
      );


    if (!signatureValid) {

      console.error(
        "Invalid Dodo webhook signature."
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Invalid webhook signature.",
        },
        401
      );
    }


    /* -----------------------------------------------------
       PARSE EVENT
    ----------------------------------------------------- */

    const event =
      JSON.parse(
        rawBody
      );


    console.log(
      "Dodo webhook received:",
      event?.type,
      webhookId
    );


    /* -----------------------------------------------------
       SUPABASE ADMIN CLIENT
    ----------------------------------------------------- */

    const supabase =
      createClient(
        supabaseUrl,
        serviceRoleKey
      );


    /* -----------------------------------------------------
       EVENT TYPE
    ----------------------------------------------------- */

    const eventType =
      event?.type;


    /*
     * We only need these two events for now.
     */

    if (
      eventType !==
        "payment.succeeded" &&
      eventType !==
        "payment.failed"
    ) {

      /*
       * Return 200 so Dodo does not retry
       * events that we intentionally don't use.
       */

      return jsonResponse({
        success: true,
        ignored: true,
        eventType,
      });
    }


    /* -----------------------------------------------------
       EVENT DATA
    ----------------------------------------------------- */

    const data =
      event?.data;


    if (!data) {

      console.error(
        "Dodo webhook has no data."
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Webhook payload missing data.",
        },
        400
      );
    }


    /* -----------------------------------------------------
       METADATA
    ----------------------------------------------------- */

    const metadata =
      data?.metadata || {};


    const consultationId =
      metadata?.consultation_id;


    const serviceId =
      metadata?.service_id;


    const productId =
      metadata?.product_id;


    if (!consultationId) {

      console.error(
        "Missing consultation_id in Dodo metadata."
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Missing consultation ID.",
        },
        400
      );
    }


    /* -----------------------------------------------------
       FETCH CONSULTATION
    ----------------------------------------------------- */

    const {
      data:
        consultation,
      error:
        consultationError,
    } =
      await supabase
        .from("consultations")
        .select("*")
        .eq(
          "id",
          consultationId
        )
        .single();


    if (
      consultationError ||
      !consultation
    ) {

      console.error(
        "Consultation not found:",
        consultationError
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Consultation not found.",
        },
        404
      );
    }


    /* -----------------------------------------------------
       IDEMPOTENCY
       
       If this payment was already processed,
       don't create/update anything again.
    ----------------------------------------------------- */

    if (
      consultation.payment_status ===
        "paid"
    ) {

      console.log(
        "Consultation already paid:",
        consultationId
      );


      /*
       * This also lets a previously failed Dodo delivery be
       * replayed after the webhook fix so the existing email
       * and Discord notification system can run.
       */
      if (
        eventType ===
        "payment.succeeded"
      ) {
        await sendConsultationNotifications(
          supabaseUrl,
          serviceRoleKey,
          consultation
        );
      }

      return jsonResponse({
        success: true,
        alreadyProcessed: true,
      });
    }


    /* -----------------------------------------------------
       PAYMENT FAILED
    ----------------------------------------------------- */

    if (
      eventType ===
      "payment.failed"
    ) {

      const {
        error:
          failedUpdateError,
      } =
        await supabase
          .from("consultations")
          .update({

            payment_status:
              "failed",

            payment_provider:
              "dodo",

            payment_id:
              data?.payment_id ||
              null,

            payment_checkout_id:
              data?.checkout_session_id ||
              consultation.payment_checkout_id ||
              null,

            payment_currency:
              data?.currency ||
              consultation.payment_currency ||
              "USD",

          })
          .eq(
            "id",
            consultationId
          );


      if (failedUpdateError) {

        console.error(
          "Failed to update failed payment:",
          failedUpdateError
        );

        return jsonResponse(
          {
            success: false,
            error:
              "Unable to update failed payment.",
          },
          500
        );
      }


      console.log(
        "Dodo payment marked failed:",
        consultationId
      );


      return jsonResponse({
        success: true,
        paymentStatus:
          "failed",
      });
    }


    /* -----------------------------------------------------
       SUCCESSFUL PAYMENT
    ----------------------------------------------------- */

    if (
      eventType ===
      "payment.succeeded"
    ) {

      /* ---------------------------------------------------
         BASIC PAYMENT DATA
      --------------------------------------------------- */

      const paymentId =
        data?.payment_id;


      const checkoutSessionId =
        data?.checkout_session_id;


      const currency =
        data?.currency;


      const totalAmount =
        data?.total_amount;


      if (!paymentId) {

        console.error(
          "Successful payment has no payment_id."
        );

        return jsonResponse(
          {
            success: false,
            error:
              "Missing payment ID.",
          },
          400
        );
      }


      /* ---------------------------------------------------
         VERIFY PRODUCT
      --------------------------------------------------- */

      if (
        productId &&
        consultation.consultation_type &&
        serviceId &&
        serviceId !==
          consultation.consultation_type
      ) {

        console.error(
          "Service mismatch in webhook.",
          {
            serviceId,
            consultationService:
              consultation.consultation_type,
          }
        );

        return jsonResponse(
          {
            success: false,
            error:
              "Payment service mismatch.",
          },
          400
        );
      }


      /* ---------------------------------------------------
         DUPLICATE PAYMENT CHECK
      --------------------------------------------------- */

      const {
        data:
          existingPayment,
        error:
          existingPaymentError,
      } =
        await supabase
          .from("consultations")
          .select("id")
          .eq(
            "payment_id",
            paymentId
          )
          .maybeSingle();


      if (
        existingPaymentError
      ) {

        console.error(
          "Payment lookup error:",
          existingPaymentError
        );

        return jsonResponse(
          {
            success: false,
            error:
              "Unable to verify payment uniqueness.",
          },
          500
        );
      }


      if (
        existingPayment &&
        existingPayment.id !==
          consultationId
      ) {

        console.error(
          "Payment already belongs to another consultation."
        );

        return jsonResponse(
          {
            success: false,
            error:
              "Payment has already been used.",
          },
          409
        );
      }


      /* ---------------------------------------------------
         CONVERT AMOUNT TO MAJOR UNIT
         
         Dodo total_amount is the smallest currency unit.
         
         For USD:
         4000 = $40
         
         We store the actual amount charged.
      --------------------------------------------------- */

      let paymentAmount =
        consultation.payment_amount;


      if (
        typeof totalAmount ===
          "number"
      ) {

        paymentAmount =
          totalAmount / 100;

      }


      /* ---------------------------------------------------
         UPDATE CONSULTATION
      --------------------------------------------------- */

      const {
        data:
          updatedConsultation,
        error:
          updateError,
      } =
        await supabase
          .from("consultations")
          .update({

            payment_status:
              "paid",

            payment_provider:
              "dodo",

            payment_amount:
              paymentAmount,

            payment_currency:
              currency ||
              consultation.payment_currency ||
              "USD",

            payment_id:
              paymentId,

            payment_order_id:
              null,

            payment_checkout_id:
              checkoutSessionId ||
              consultation.payment_checkout_id ||
              null,

            paid_at:
              new Date().toISOString(),

            status:
              "pending",

          })
          .eq(
            "id",
            consultationId
          )
          .select("*")
          .single();


      if (updateError) {

        console.error(
          "Failed to mark consultation paid:",
          updateError
        );

        return jsonResponse(
          {
            success: false,
            error:
              "Unable to update consultation.",
          },
          500
        );
      }


      console.log(
        "Dodo payment successfully processed:",
        {
          consultationId,
          paymentId,
          serviceId,
          productId,
          currency,
          totalAmount,
        }
      );


      /* ---------------------------------------------------
         SEND EXISTING EMAIL + DISCORD NOTIFICATIONS
      --------------------------------------------------- */

      await sendConsultationNotifications(
        supabaseUrl,
        serviceRoleKey,
        updatedConsultation
      );


      return jsonResponse({

        success: true,

        paymentStatus:
          "paid",

        consultationId:
          updatedConsultation.id,

        paymentId,

      });
    }


    return jsonResponse({
      success: true,
    });


  } catch (error) {

    console.error(
      "dodo-webhook error:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          error?.message ||
          "Unexpected webhook error.",
      },
      500
    );
  }
});
