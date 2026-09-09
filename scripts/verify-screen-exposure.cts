import { app, BrowserWindow } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
const directory = path.resolve("work/screen-exposure");
app.setPath("userData", path.join(directory, `profile-${process.pid}`));
app.whenReady().then(async () => {
  let window: BrowserWindow | undefined;
  try {
    const { build } = await import("vite");
    await build({
      configFile: false,
      logLevel: "error",
      build: {
        outDir: path.join(directory, "bundle"),
        emptyOutDir: true,
        lib: {
          entry: path.resolve("src/core/screen-blur.ts"),
          formats: ["es"],
          fileName: () => "exposure.js",
        },
      },
    });
    const fixture = path.join(directory, "fixture.html");
    await fs.writeFile(
      fixture,
      "<!doctype html><title>Screen exposure verification</title>",
    );
    window = new BrowserWindow({
      show: false,
      webPreferences: { sandbox: true },
    });
    await window.loadFile(fixture);
    const url = pathToFileURL(path.join(directory, "bundle/exposure.js")).href;
    console.log(
      await window.webContents.executeJavaScript(`(async () => {
      const { drawScreenExposure } = await import(${JSON.stringify(url)});
      const make = () => { const c = document.createElement('canvas'); c.width=320; c.height=240; return c; };
      const full=make(), bounded=make(), source=make(), sc=source.getContext('2d');
      for(let x=0;x<320;x+=3) { sc.fillStyle=x%2?'#25b5aacc':'#fd7833'; sc.fillRect(x,0,3,240); }
      const transforms=Array.from({length:12},(_,i)=>({x:i*.013,y:0,scale:1}));
      let cases=0;
      for(const b of [
        {x:20,y:15,width:190,height:175}, {x:20.25,y:15.75,width:190.5,height:175.1},
        {x:-12.25,y:-5.5,width:190.5,height:175.1}, {x:200.25,y:190.5,width:190.5,height:175.1},
        {x:21.25,y:16.75,width:190.5,height:175.1},
      ]) {
        for(const canvas of [full,bounded]) {
          const c=canvas.getContext('2d'); c.clearRect(0,0,320,240); c.save();
          c.beginPath(); c.roundRect(b.x,b.y,b.width,b.height,7.5); c.clip();
          drawScreenExposure(c,320,240,transforms,(sample,t)=>{
            sample.drawImage(source,t.x*10,0,240,200,b.x,b.y,b.width,b.height);
            sample.save(); sample.beginPath(); sample.rect(b.x,b.y,30,b.height); sample.clip();
            sample.filter='blur(4px)'; sample.drawImage(source,b.x,b.y); sample.restore();
            sample.fillStyle='#ffd55088'; sample.fillRect(b.x+15,b.y+10,20,30);
          },canvas===bounded?b:undefined); c.restore();
        }
        const a=full.getContext('2d').getImageData(0,0,320,240).data;
        const bPixels=bounded.getContext('2d').getImageData(0,0,320,240).data;
        const mismatch=a.findIndex((v,i)=>v!==bPixels[i]);
        if(mismatch!==-1) throw Error('Pixel mismatch at '+mismatch+' values '+a[mismatch]+'/'+bPixels[mismatch]+' max '+a.reduce((m,v,i)=>Math.max(m,Math.abs(v-bPixels[i])),0)+' for '+JSON.stringify(b));
        cases++;
      }
      return {cases, exactPixelMatch:true};
    })()`),
    );
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    window?.destroy();
    app.exit(Number(process.exitCode ?? 0));
  }
});
