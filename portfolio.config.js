const PORTFOLIO_SETS = {
  full:   { label: 'Full',   title: 'Saiful Muin Zainal - Video Portfolio All', data: 'dataFull.json' },
  aonic:  { label: 'Aonic',  title: 'Saiful Muin Zainal - Aonic Video Portfolio', data: 'dataAonic.json' },  
  raifili: { label: 'Raifili', title: 'Saiful Muin Zainal - Raifili Video Portfolio', data: 'dataRaifili.json' },
  nstp:   { label: 'NSTP',   title: 'Saiful Muin Zainal - NSTP Video Portfolio', data: 'dataNSTP.json' },
  others: { label: 'Others', title: 'Saiful Muin Zainal - Others Video Portfolio', data: 'dataOthers.json' }
};

function getSetKey(){
  const params = new URLSearchParams(window.location.search);
  const key = (params.get('set') || 'full').toLowerCase();
  return PORTFOLIO_SETS[key] ? key : 'full';
}

function getCurrentSet(){
  const key = getSetKey();
  return { key, ...PORTFOLIO_SETS[key] };
}
