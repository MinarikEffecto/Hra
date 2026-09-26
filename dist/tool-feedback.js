const CUTTING_LABELS = {flake: 'Úštěp', chopper: 'Sekáč', axe: 'Sekera'};

// Keep the action prompt and the harvest marker in agreement with the held tool.
export function toolFeedback({tool, target = null, mobile = false, paused = false, digAllowed = true}) {
  const empty = {text: '', highlight: false};
  if (paused) return empty;
  if (tool === 'hands') return {text: 'Seber označené kameny. První nástroj vyrobíš v batohu.', highlight: false};
  const input = mobile ? 'Podrž akci' : 'F';
  if (tool === 'shovel') return {
    text: digAllowed ? `${input} · kopat na označeném místě` : 'Tady kopat nelze. Přesuň se na volné místo.',
    highlight: false,
  };
  if (tool === 'shotgun') return {text: `${input} · vystřelit ve směru pohledu`, highlight: false};
  const label = CUTTING_LABELS[tool];
  if (!label) return empty;
  // Island palms have no kind field; game.nearest() returns only palms or bushes.
  const reachable = target?.state === 'standing' && (target.kind === 'bush' || tool !== 'flake');
  if (reachable) return {
    text: `${label} · ${input} · ${target.kind === 'bush' ? 'posekat keř' : 'pokácet palmu'} · ${target.hp}/${target.kind === 'bush' ? 2 : 4}`,
    highlight: true,
  };
  return {
    text: tool === 'flake' ? 'Úštěp poseká keř. Na palmu potřebuješ sekáč nebo sekeru.' : `${label}: přibliž se k palmě nebo keři.`,
    highlight: false,
  };
}
