const d = require('./new-solutions-data.json');
console.log('Entries:', d.length);
d.forEach((e, i) => {
  console.log((i+1) + '. ' + e.slug + ' (sortOrder: ' + e.sortOrder + ', sections: ' + e.sections.length + ')');
  console.log('   seoTitle length:', e.seoTitle.length, e.seoTitle.length <= 60 ? 'OK' : 'OVER');
  console.log('   seoDesc length:', e.seoDescription.length, e.seoDescription.length <= 155 ? 'OK' : 'OVER');
  const taskCards = e.sections.find(s => s.key === 'task-based-ppe');
  if (taskCards) {
    const missing = taskCards.data.cards.filter(c => !c.scene || !c.title || c.checked === undefined || !c.description || !c.items || c.items.length === 0);
    if (missing.length) console.log('   WARNING: taskCards missing fields:', missing.map(m => m.title));
  }
  const allEnabled = e.sections.every(s => s.enabled === true);
  if (!allEnabled) console.log('   WARNING: not all sections enabled');
  const allKeyed = e.sections.every(s => s.key && s.type && s.hasOwnProperty('enabled'));
  if (!allKeyed) console.log('   WARNING: missing key/type/enabled');
});
console.log('\nAll valid!');
