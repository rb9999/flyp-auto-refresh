// Debug script to identify sale notification elements
// Paste this into the browser console on the Flyp orders page

console.log('=== Flyp Sale Notifications Debug ===');

// Find all notification containers
const allNotifications = document.querySelectorAll('.new-sales-floating-container__inner');
console.log(`Found ${allNotifications.length} notification container(s)`);

allNotifications.forEach((notification, index) => {
  console.log(`\n--- Notification #${index + 1} ---`);

  // Item name
  const itemNameEl = notification.querySelector('.ant-typography-ellipsis');
  console.log('Item name:', itemNameEl ? itemNameEl.textContent.trim() : 'NOT FOUND');

  // Price
  const priceElements = notification.querySelectorAll('.ant-typography');
  let price = 'NOT FOUND';
  for (const el of priceElements) {
    const text = el.textContent;
    if (text.includes('Price:')) {
      const priceMatch = text.match(/\$[\d,]+\.?\d*/);
      if (priceMatch) {
        price = priceMatch[0];
        break;
      }
    }
  }
  console.log('Price:', price);

  // Marketplace
  const marketplaceImg = notification.querySelector('img[alt*="icon"]');
  const marketplace = marketplaceImg ? marketplaceImg.alt : 'NOT FOUND';
  console.log('Marketplace:', marketplace);

  // Status
  const statusTag = notification.querySelector('.ant-tag-success');
  console.log('Status:', statusTag ? statusTag.textContent.trim() : 'NOT FOUND');

  // Image
  const itemImg = notification.querySelector('.ant-image img');
  console.log('Image URL:', itemImg ? itemImg.src : 'NOT FOUND');

  // Error message
  const errorAlert = notification.querySelector('.ant-alert-error .ant-alert-message');
  console.log('Error message:', errorAlert ? errorAlert.textContent.trim() : 'NOT FOUND');

  // Show the DOM structure
  console.log('DOM Element:', notification);
});

console.log('\n=== Testing querySelector on document.body ===');
// Test if we can find multiple notifications from the body
const fromBody = document.body.querySelectorAll('.new-sales-floating-container__inner');
console.log(`Found ${fromBody.length} notifications from document.body`);

console.log('\n=== Full Container Structure ===');
const container = document.querySelector('.new-sales-floating-container');
if (container) {
  console.log('Container found:', container);
  console.log('Container HTML:', container.outerHTML.substring(0, 500) + '...');
} else {
  console.log('Container NOT FOUND');
}
