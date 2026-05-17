import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Called by pg_cron at 00:00 UTC. Stamps yesterday's pending logs as failed
// and spawns today's pending rows for every user.
export const Route = createFileRoute("/api/public/midnight-reset")({
  server: {
    handlers: {
      POST: async () => {
        const { error } = await supabaseAdmin.rpc("midnight_reset_all");
        if (error) {
          return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500, headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ ok: true, at: new Date().toISOString() }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
