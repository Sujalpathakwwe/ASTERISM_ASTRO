import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

/* =========================================================
   DODO PRODUCTS
========================================================= */

const PRODUCTS = {
  palmistry: {
    name: "Palm Reading",
    productId: "pdt_0NnzaeLhXw45LndbBNKBd",
    usd: 40,
  },

  "birth-chart": {
    name: "Vedic Birth Chart",
    productId: "pdt_0NnzajUh0UmDlGcvYHQC2",
    usd: 66,
  },

  "western-astrology": {
    name: "Western Astrology Reading",
    productId: "pdt_0Nnzaq6ledxuETsst3VwD",
    usd: 66,
  },

  relationship: {
    name: "Relationship Analysis",
    productId: "pdt_0NnzaurwAyyNYxbWeUfX9",
    usd: 59,
  },

  "career-finance": {
    name: "Career & Finance",
    productId: "pdt_0Nnzb02UKEslu0caFQYl7",
    usd: 59,
  },

  "career-deep-dive": {
    name: "Career Deep Dive",
    productId: "pdt_0Nnzb6f5R6zLSaf6KbvFU",
    usd: 99,
  },

  "relationship-deep-dive": {
    name: "Relationship Deep Dive",
    productId: "pdt_0NnzbBxX9fmCtmC4XcQV5",
    usd: 99,
  },

  "life-path": {
    name: "Life Path Deep Reading",
    productId: "pdt_0NnzbGgtsE6jAo3yqhU5d",
    usd: 119,
  },

  "dasha-timing": {
    name: "Dasha & Timing Reading",
    productId: "pdt_0NnzbMoYp8xAh73UdvnkN",
    usd: 119,
  },

  astrocartography: {
    name: "Astrocartography Reading",
    productId: "pdt_0NnzbS0rmeQ5FThgumEKl",
    usd: 104,
  },

  synastry: {
    name: "Synastry & Compatibility",
    productId: "pdt_0NnzbWrGO0ZtRhPnP6P9o",
    usd: 79,
  },

  marriage: {
    name: "Marriage & Partnership",
    productId: "pdt_0NnzbckImVDgr0axXUD7W",
    usd: 79,
  },
};


/* =========================================================
   RESPONSE HELPER
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
      Deno.env.get("SUPABASE_URL");

    const supabaseAnonKey =
      Deno.env.get("SUPABASE_ANON_KEY");

    const supabaseServiceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY"
      );

    const dodoApiKey =
      Deno.env.get("DODO_API_KEY");


    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      !supabaseServiceRoleKey ||
      !dodoApiKey
    ) {
      console.error(
        "Missing required environment variables."
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Server configuration is incomplete.",
        },
        500
      );
    }


    /* -----------------------------------------------------
       AUTHENTICATE USER
    ----------------------------------------------------- */

    const authorization =
      req.headers.get("Authorization");


    if (!authorization) {
      return jsonResponse(
        {
          success: false,
          error:
            "Authentication required.",
        },
        401
      );
    }


    const userClient =
      createClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          global: {
            headers: {
              Authorization:
                authorization,
            },
          },
        }
      );


    const {
      data: {
        user,
      },
      error:
        userError,
    } =
      await userClient.auth.getUser();


    if (
      userError ||
      !user
    ) {
      console.error(
        "Authentication error:",
        userError
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Invalid or expired session.",
        },
        401
      );
    }


    /* -----------------------------------------------------
       SERVICE-ROLE CLIENT
       Used only server-side.
    ----------------------------------------------------- */

    const adminClient =
      createClient(
        supabaseUrl,
        supabaseServiceRoleKey
      );


    /* -----------------------------------------------------
       REQUEST BODY
    ----------------------------------------------------- */

    const body =
      await req.json();


    const serviceId =
      body?.serviceId;

    const consultationData =
      body?.consultationData;


    if (
      !serviceId ||
      !consultationData
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Missing service or consultation data.",
        },
        400
      );
    }


    /* -----------------------------------------------------
       PRODUCT
    ----------------------------------------------------- */

    const product =
      PRODUCTS[
        serviceId as keyof typeof PRODUCTS
      ];


    if (!product) {
      return jsonResponse(
        {
          success: false,
          error:
            "Invalid consultation service.",
        },
        400
      );
    }


    /* -----------------------------------------------------
       CREATE PENDING CONSULTATION
       
       The browser does NOT control user_id.
       The authenticated Supabase user is always used.
    ----------------------------------------------------- */

    const consultationInsert = {

      user_id:
        user.id,

      service_name:
        product.name,

      status:
        "pending",

      consultation_type:
        serviceId,

      preferred_date:
        consultationData.preferred_date ||
        null,

      contact_method:
        consultationData.contact_method ||
        null,

      contact_details:
        consultationData.contact_details ||
        null,

      consultation_message:
        consultationData.consultation_message ||
        null,


      /* CLIENT */

      client_birth_date:
        consultationData.client_birth_date ||
        null,

      client_birth_time:
        consultationData.client_birth_time ||
        null,

      client_birth_time_known:
        consultationData.client_birth_time_known ??
        null,

      client_birth_country:
        consultationData.client_birth_country ||
        null,

      client_birth_region:
        consultationData.client_birth_region ||
        null,

      client_birth_city:
        consultationData.client_birth_city ||
        null,

      client_birth_latitude:
        consultationData.client_birth_latitude ||
        null,

      client_birth_longitude:
        consultationData.client_birth_longitude ||
        null,

      client_birth_timezone:
        consultationData.client_birth_timezone ||
        null,


      /* RELATIONSHIP */

      relationship_status:
        consultationData.relationship_status ||
        null,


      /* PARTNER */

      partner_name:
        consultationData.partner_name ||
        null,

      partner_birth_date:
        consultationData.partner_birth_date ||
        null,

      partner_birth_time:
        consultationData.partner_birth_time ||
        null,

      partner_birth_time_known:
        consultationData.partner_birth_time_known ??
        null,

      partner_birth_country:
        consultationData.partner_birth_country ||
        null,

      partner_birth_region:
        consultationData.partner_birth_region ||
        null,

      partner_birth_city:
        consultationData.partner_birth_city ||
        null,

      partner_birth_latitude:
        consultationData.partner_birth_latitude ||
        null,

      partner_birth_longitude:
        consultationData.partner_birth_longitude ||
        null,

      partner_birth_timezone:
        consultationData.partner_birth_timezone ||
        null,


      /* PAYMENT */

      payment_status:
        "pending",

      payment_provider:
        "dodo",

      payment_amount:
        product.usd,

      payment_currency:
        "USD",
    };


    const {
      data:
        consultation,
      error:
        consultationError,
    } =
      await adminClient
        .from("consultations")
        .insert(
          consultationInsert
        )
        .select("id")
        .single();


    if (
      consultationError ||
      !consultation
    ) {

      console.error(
        "Consultation creation failed:",
        consultationError
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Unable to create booking.",
        },
        500
      );
    }


    /* -----------------------------------------------------
       CREATE DODO CHECKOUT
    ----------------------------------------------------- */

    const dodoResponse =
      await fetch(
        "https://live.dodopayments.com/checkouts",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${dodoApiKey}`,

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({

            product_cart: [
              {
                product_id:
                  product.productId,

                quantity: 1,
              },
            ],


            return_url:
              "https://www.asterismastro.com/account?payment=dodo",

            cancel_url:
              "https://www.asterismastro.com/book-consultation",


            metadata: {

              consultation_id:
                consultation.id,

              user_id:
                user.id,

              service_id:
                serviceId,

              product_id:
                product.productId,
            },
          }),
        }
      );


    /* -----------------------------------------------------
       DODO ERROR
    ----------------------------------------------------- */

    if (!dodoResponse.ok) {

      const errorText =
        await dodoResponse.text();

      console.error(
        "Dodo checkout creation failed:",
        dodoResponse.status,
        errorText
      );


      /*
       * Checkout failed, so remove the pending
       * consultation we just created.
       */

      await adminClient
        .from("consultations")
        .delete()
        .eq(
          "id",
          consultation.id
        )
        .eq(
          "user_id",
          user.id
        );


      return jsonResponse(
        {
          success: false,
          error:
            "Unable to create Dodo checkout.",
        },
        500
      );
    }


    /* -----------------------------------------------------
       DODO RESPONSE
    ----------------------------------------------------- */

    const checkout =
      await dodoResponse.json();


    if (
      !checkout?.checkout_url ||
      !checkout?.session_id
    ) {

      console.error(
        "Invalid Dodo checkout response:",
        checkout
      );


      await adminClient
        .from("consultations")
        .delete()
        .eq(
          "id",
          consultation.id
        )
        .eq(
          "user_id",
          user.id
        );


      return jsonResponse(
        {
          success: false,
          error:
            "Dodo did not return a checkout URL.",
        },
        500
      );
    }


    /* -----------------------------------------------------
       SAVE DODO CHECKOUT SESSION
    ----------------------------------------------------- */

    const {
      error:
        updateError,
    } =
      await adminClient
        .from("consultations")
        .update({
          payment_checkout_id:
            checkout.session_id,
        })
        .eq(
          "id",
          consultation.id
        )
        .eq(
          "user_id",
          user.id
        );


    if (updateError) {

      console.error(
        "Failed to save Dodo checkout ID:",
        updateError
      );


      /*
       * Do not delete the consultation here.
       * The checkout may already exist.
       * Keeping it allows us to recover it
       * through the webhook.
       */

      return jsonResponse(
        {
          success: false,
          error:
            "Checkout was created, but the booking could not be prepared.",
        },
        500
      );
    }


    /* -----------------------------------------------------
       SUCCESS
    ----------------------------------------------------- */

    return jsonResponse({

      success: true,

      checkoutUrl:
        checkout.checkout_url,

      sessionId:
        checkout.session_id,

      consultationId:
        consultation.id,

      serviceId,

      productId:
        product.productId,

      usdPrice:
        product.usd,
    });


  } catch (error) {

    console.error(
      "create-dodo-checkout error:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          error?.message ||
          "Unexpected server error.",
      },
      500
    );
  }
});
