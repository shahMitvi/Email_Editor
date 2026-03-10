import puppeteer from 'puppeteer';

(async () => {
  const delay = ms => new Promise(r => setTimeout(r, ms));
  console.log('Starting puppeteer tests...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', error => console.error('BROWSER ERROR:', error.message));

  console.log('Navigating to localhost...');
  await page.goto('http://localhost:5173', { waitUntil: 'load' });
  await delay(2000);

  const canvasLoaded = await page.evaluate(() => !!document.querySelector('[data-canvas]'));
  console.log('Canvas loaded:', canvasLoaded);

  try {
    const buttonSource = await page.evaluate(() => {
      const blocks = Array.from(document.querySelectorAll('div'));
      const btn = blocks.find(b => b.textContent?.includes('Button') && b.innerHTML.includes('lucide'));
      if(btn) {
         const r = btn.getBoundingClientRect();
         return { x: r.left + r.width/2, y: r.top + r.height/2 };
      }
      return null;
    });
    
    if (buttonSource) {
      console.log('Dragging from sidebar...');
      await page.mouse.move(buttonSource.x, buttonSource.y);
      await page.mouse.down();
      await page.mouse.move(buttonSource.x + 300, buttonSource.y + 100);
      await delay(500);
      await page.mouse.up();
      await delay(1000);
    }
  } catch(e) {}

  await page.evaluate(() => {
     const el = document.querySelector('[data-canvas] [id^="el-"]');
     if(el) {
        const ev = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
        el.dispatchEvent(ev);
     }
  });
  await delay(1000);

  const moveHandle = await page.evaluate(() => {
    const handles = Array.from(document.querySelectorAll('div')).filter(d => 
       d.className.includes('cursor-grab') && d.className.includes('bg-indigo-500')
    );
    if(handles.length > 0) {
      const r = handles[0].getBoundingClientRect();
      return { x: r.left + r.width/2, y: r.top + r.height/2 };
    }
    return null;
  });

  if(moveHandle) {
     console.log('Found Move handle!', moveHandle);
     const initialStyle = await page.evaluate(() => document.querySelector('[data-canvas] [id^="el-"]').getAttribute('style'));
     console.log('Initial Style:', initialStyle);

     await page.mouse.move(moveHandle.x, moveHandle.y);
     await page.mouse.down();
     await delay(200);

     await page.mouse.move(moveHandle.x + 100, moveHandle.y + 100, { steps: 5 });
     await delay(500);
     
     const duringStyle = await page.evaluate(() => document.querySelector('[data-canvas] [id^="el-"]').getAttribute('style'));
     console.log('Style during drag:', duringStyle);
     
     await page.mouse.up();
     await delay(500);

     const finalStyle = await page.evaluate(() => document.querySelector('[data-canvas] [id^="el-"]').getAttribute('style'));
     console.log('Final Style:', finalStyle);
  } else {
     console.log('No move handle found.');
  }

  await browser.close();
})();
