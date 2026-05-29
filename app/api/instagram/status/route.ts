type InstagramAccount = {
  id?: string;
  username?: string;
  profile_picture_url?: string;
};

type InstagramGraphError = {
  message?: string;
  type?: string;
  code?: number;
};

type InstagramGraphResponse = InstagramAccount & {
  error?: InstagramGraphError;
};

function hasEnvValue(name: string) {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0;
}

export async function GET() {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
  const businessAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID?.trim();
  const graphVersion = process.env.INSTAGRAM_GRAPH_VERSION?.trim();
  const tokenPresent = hasEnvValue("INSTAGRAM_ACCESS_TOKEN");
  const businessAccountIdPresent = hasEnvValue(
    "INSTAGRAM_BUSINESS_ACCOUNT_ID",
  );
  const graphVersionPresent = hasEnvValue("INSTAGRAM_GRAPH_VERSION");
  const configured =
    tokenPresent && businessAccountIdPresent && graphVersionPresent;

  console.info("[Instagram Status] env check", {
    configured,
    graphVersionPresent,
  });
  console.info("[Instagram Status] business account id present yes/no", {
    present: businessAccountIdPresent,
  });
  console.info("[Instagram Status] token present yes/no", {
    present: tokenPresent,
  });

  if (!configured || !accessToken || !businessAccountId || !graphVersion) {
    return Response.json({
      provider: "instagram",
      configured: false,
      account: null,
      tokenPresent,
      businessAccountIdPresent,
      graphVersion: graphVersion ?? null,
    });
  }

  const graphUrl = new URL(
    `https://graph.facebook.com/${graphVersion}/${businessAccountId}`,
  );
  graphUrl.searchParams.set("fields", "id,username,profile_picture_url");
  graphUrl.searchParams.set("access_token", accessToken);

  console.info("[Instagram Status] graph request started", {
    graphVersion,
    businessAccountIdPresent,
  });

  try {
    const response = await fetch(graphUrl, {
      method: "GET",
      cache: "no-store",
    });
    const payload = (await response.json()) as InstagramGraphResponse;

    if (!response.ok || payload.error) {
      console.warn("[Instagram Status] graph request error", {
        status: response.status,
        type: payload.error?.type,
        code: payload.error?.code,
      });

      return Response.json(
        {
          provider: "instagram",
          configured: false,
          error: {
            message: payload.error?.message ?? "Instagram Graph API error",
            type: payload.error?.type ?? "GraphAPIException",
            code: payload.error?.code ?? response.status,
          },
        },
        { status: response.ok ? 500 : response.status },
      );
    }

    console.info("[Instagram Status] graph request success", {
      accountPresent: Boolean(payload.id),
      usernamePresent: Boolean(payload.username),
    });

    return Response.json({
      provider: "instagram",
      configured: true,
      account: {
        id: payload.id ?? null,
        username: payload.username ?? null,
        profile_picture_url: payload.profile_picture_url ?? null,
      },
      tokenPresent,
      businessAccountIdPresent,
      graphVersion,
    });
  } catch (error) {
    console.error("[Instagram Status] graph request error", {
      message:
        error instanceof Error
          ? error.message
          : "Unknown Instagram Graph API error",
    });

    return Response.json(
      {
        provider: "instagram",
        configured: false,
        error: {
          message:
            error instanceof Error
              ? error.message
              : "Unknown Instagram Graph API error",
          type: "request_error",
          code: 500,
        },
      },
      { status: 500 },
    );
  }
}
