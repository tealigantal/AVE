export function safeMediaRow(row: any): unknown {
  const streams = row.metadata?.probe?.timing?.streams ?? {};
  return {
    asset_location_id: row.asset_location_id,
    asset_id: row.asset_id,
    location_type: row.location_type,
    permission_state: row.metadata?.permission_state,
    verified_at: row.verified_at,
    metadata: {
      probe: {
        timing: {
          streams: Object.fromEntries(Object.entries(streams).map(([id, stream]: [string, any]) => [id, {
            codec_type: stream?.codec_type,
            time_base: stream?.time_base,
            duration_ts: stream?.duration_ts,
            width: stream?.width,
            height: stream?.height,
          }]))
        }
      }
    }
  };
}
