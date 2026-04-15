import { useCallback, useRef } from "react";
import { supabase, supabaseEnabled } from "../lib/supabase";

const TABLE = "analysis_history";
const DEFAULT_LIMIT = 50;

export function useSupabase() {
  const savingRef = useRef(false);

  const saveAnalysis = useCallback(async (result) => {
    if (!supabaseEnabled || savingRef.current || !result) {
      return null;
    }

    savingRef.current = true;

    try {
      const payload = {
        domain: result.domain || "unknown",
        result_json: result,
      };

      const { error } = await supabase.from(TABLE).insert(payload);

      if (error) {
        console.error("[Supabase] Insert failed:", error.message);
        return null;
      }

      return payload;
    } catch (error) {
      console.error("[Supabase] Unexpected insert error:", error);
      return null;
    } finally {
      savingRef.current = false;
    }
  }, []);

  const fetchHistory = useCallback(async (limit = DEFAULT_LIMIT) => {
    if (!supabaseEnabled) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select("id, domain, result_json, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("[Supabase] Fetch failed:", error.message);
        return [];
      }

      return (data || []).map((row) => ({
        ...row.result_json,
        id: row.id,
        domain: row.domain || row.result_json?.domain || "unknown",
        created_at: row.created_at || row.result_json?.created_at,
        _supabase_id: row.id,
      }));
    } catch (error) {
      console.error("[Supabase] Unexpected fetch error:", error);
      return [];
    }
  }, []);

  return {
    fetchHistory,
    saveAnalysis,
    supabaseEnabled,
  };
}
