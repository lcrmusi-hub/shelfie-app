import webpush from "npm:web-push";
import { createClient } from "npm:@supabase/supabase-js";

webpush.setVapidDetails(
  "mailto:you@example.com",
  Deno.env.get("VAPID_PUBLIC_KEY"),
  Deno.env.get("VAPID_PRIVATE_KEY")
);

const supabase = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
);

Deno.serve(async () => {
  const { data: atRisk } = await supabase.rpc("get_streak_at_risk_users");

  for (const user of atRisk ?? []) {
    const { data: sub } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", user.id)
      .single();
    if (!sub) continue;

    try {
      await webpush.sendNotification(
        sub.subscription,
        JSON.stringify({
          title: "Shelfie",
          body: `You're on a ${user.streak}-day streak! Read today to keep it alive 🔥`,
          url: "/",
        })
      );
    } catch (e) {
      console.warn(`Push failed for user ${user.id}:`, e);
    }
  }

  return new Response("ok");
});
