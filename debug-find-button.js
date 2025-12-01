// DEBUG SCRIPT - Run this in the browser console (F12) on the Flyp orders page
// This will help identify the correct selector for the refresh button

console.log('=== FLYP REFRESH BUTTON FINDER ===');

// Find all clickable elements
const allButtons = document.querySelectorAll('button, [role="button"], a, [onclick]');
console.log(`Found ${allButtons.length} clickable elements`);

// Find elements with "refresh" in text
console.log('\n--- Elements with "Refresh" text ---');
allButtons.forEach((btn, index) => {
  const text = btn.textContent.trim();
  if (text.toLowerCase().includes('refresh')) {
    console.log(`[${index}] Text: "${text}"`);
    console.log('   Element:', btn);
    console.log('   Classes:', btn.className);
    console.log('   ID:', btn.id);
    console.log('   Tag:', btn.tagName);
    console.log('---');
  }
});

// Find elements with refresh icon
console.log('\n--- Elements with SVG icons ---');
allButtons.forEach((btn, index) => {
  const svg = btn.querySelector('svg');
  if (svg) {
    console.log(`[${index}] Text: "${btn.textContent.trim()}"`);
    console.log('   Element:', btn);
    console.log('   Classes:', btn.className);
    console.log('---');
  }
});

// Try to find the actual refresh button by looking at the screenshot structure
console.log('\n--- Looking for "My orders" section elements ---');
const myOrdersSection = document.querySelector('[class*="order" i]');
if (myOrdersSection) {
  console.log('Found orders section:', myOrdersSection);
  const nearbyButtons = myOrdersSection.querySelectorAll('button, [role="button"]');
  console.log('Buttons near orders:', nearbyButtons);
  nearbyButtons.forEach(btn => {
    console.log('  -', btn.textContent.trim(), btn);
  });
}

console.log('\n=== END DEBUG ===');
console.log('Copy the element that looks like the Refresh button and I can help identify it!');
