import assert from "node:assert/strict";
import { app, BrowserWindow } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
app.setPath(
  "userData",
  path.resolve(`work/background-filter/profile-${process.pid}`),
);
app.whenReady().then(async () => {
  try {
    const window = new BrowserWindow({
      show: false,
      webPreferences: { sandbox: true, backgroundThrottling: false },
    });
    await window.loadURL("about:blank");
    const source = (
      await fs.readFile("work/background-filter/background-filter.js", "utf8")
    ).replace("export class BackgroundFilter", "class BackgroundFilter");
    const result = await window.webContents.executeJavaScript(`(() => {
      ${source}
      const size = 128;
      const input = new OffscreenCanvas(size,size);
      const c = input.getContext('2d');
      const data = c.createImageData(size,size);
      for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
        const i=(y*size+x)*4;
        data.data[i]=x<64?240:20;
        data.data[i+1]=y<55?180:40;
        data.data[i+2]=y>80?220:30;
        data.data[i+3]=255;
      }
      c.putImageData(data,0,0);
      const filter = new BackgroundFilter();
      const checks=[];
      for (const strength of [0,3,12,24]) {
        const gpu=filter.render(input,strength);
        if(!gpu) throw Error('GPU filter unavailable');
        const output=new OffscreenCanvas(size,size).getContext('2d');
        output.drawImage(gpu,0,0);
        const actual=output.getImageData(0,0,size,size).data;
        let expected=new Uint8ClampedArray(data.data);
        const weights=[0.153388,0.221461,0.250301,0.221461,0.153388];
        for(let axis=0;axis<2;axis++) for(let pass=0;pass<20;pass++) {
          const next=new Uint8ClampedArray(expected.length);
          for(let y=0;y<size;y++) for(let x=0;x<size;x++) for(let channel=0;channel<4;channel++) {
            let sum=0;
            for(let tap=0;tap<5;tap++) {
              const at=(axis===0?x:y)+(tap-2)*strength/20;
              const lo=Math.floor(at), f=at-lo;
              const read=n=> {
                n=Math.max(0,Math.min(size-1,n));
                return expected[((axis===0?y:n)*size+(axis===0?n:x))*4+channel];
              };
              sum+=weights[tap]*((1-f)*read(lo)+f*read(lo+1));
            }
            next[(y*size+x)*4+channel]=Math.round(sum);
          }
          expected=next;
        }
        let max=0,total=0,count=0;
        // Interior isolates the kernel from framebuffer border and alpha rules.
        for(let y=40;y<88;y++) for(let x=40;x<88;x++) for(let channel=0;channel<3;channel++) {
          const i=(y*size+x)*4+channel;
          const error=Math.abs(actual[i]-expected[i]);
          max=Math.max(max,error);total+=error;count++;
        }
        checks.push({strength,max,mean:total/count});
      }
      const translucent=new OffscreenCanvas(128,128);
      const tc=translucent.getContext('2d');
      tc.fillStyle='rgba(255,0,0,0.5)';tc.fillRect(0,0,64,128);
      const alphaOutput=filter.render(translucent,12);
      if(!alphaOutput) throw Error('Alpha filtering failed');
      const ac=new OffscreenCanvas(128,128).getContext('2d');
      ac.drawImage(alphaOutput,0,0);
      const alphaPixel=Array.from(ac.getImageData(64,64,1,1).data);
      // Reusing the renderer at a different size must reallocate both textures.
      const small=new OffscreenCanvas(40,60);
      small.getContext('2d').fillRect(0,0,40,60);
      const resized=filter.render(small,2);
      return {checks,alphaPixel,resized:[resized?.width,resized?.height]};
    })()`);
    for (const check of result.checks) {
      assert.ok(check.max <= 3, JSON.stringify(check));
      assert.ok(check.mean < 0.8, JSON.stringify(check));
    }
    assert.ok(result.alphaPixel[0] >= 254, JSON.stringify(result.alphaPixel));
    assert.equal(result.alphaPixel[1], 0);
    assert.equal(result.alphaPixel[2], 0);
    assert.ok(result.alphaPixel[3] > 30 && result.alphaPixel[3] < 100);
    assert.deepEqual(result.resized, [40, 60]);
    console.log(JSON.stringify(result));
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
