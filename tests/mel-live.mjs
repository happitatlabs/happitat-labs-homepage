import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";

// Explicit production check; no authenticated turns or paid Azure calls.
// Never automate solving a real challenge or export browser cookies here.
if (!process.argv.includes("--verify-security")) {
  console.error("Requires explicit production check: --verify-security (no AI calls)");
  process.exit(1);
}
const results = [];
try {
  for (const origin of ["https://happitatlabs.com", "https://www.happitatlabs.com"]) {
    const page = await fetch(origin, {redirect:"error",signal:AbortSignal.timeout(20_000)});
    assert.equal(page.status,200);
    assert.equal(page.headers.get("X-Frame-Options"),"DENY");
    assert.match(page.headers.get("Content-Security-Policy"), /frame-ancestors 'none'/);
    assert.match(page.headers.get("Content-Security-Policy"), /https:\/\/challenges.cloudflare.com/);
    assert.match(page.headers.get("Strict-Transport-Security"), /max-age=86400/);
    await page.body?.cancel();
    const post = (path, body, headers={}) => fetch(origin+path, {
      method:"POST",redirect:"error",signal:AbortSignal.timeout(20_000),
      headers:{Origin:origin,"Content-Type":"application/json",...headers},body:JSON.stringify(body),
    });
    for (const [name,path,body,headers,status,code] of [
      ["cross_origin","/api/mel/session",{},{Origin:"https://other.invalid"},403,"forbidden"],
      ["unverified_session","/api/mel/session",{},{},403,"challenge_required"],
      ["anonymous_turn","/api/mel/turn",{question:"Public portfolio",requestId:randomUUID()},{},401,"session_required"],
    ]) {
      const response = await post(path,body,headers);
      assert.equal(response.status,status,name);
      assert.equal((await response.json()).code,code,name);
      assert.equal(response.headers.get("Set-Cookie"),null);
      assert.equal(response.headers.get("Cache-Control"),"no-store");
      assert.equal(response.headers.get("Access-Control-Allow-Origin"),null);
      results.push({host:new URL(origin).hostname,check:name,status,passed:true});
    }
  }
  const proof = {passed:true,checkedAt:new Date().toISOString(),authenticatedTurns:0,results};
  writeFileSync(".tmp-mel-security-live-proof.json",JSON.stringify(proof,null,2));
  console.log(JSON.stringify(proof,null,2));
} catch {
  // Deliberately omit raw responses/errors/cookies from the report.
  const proof = {passed:false,checkedAt:new Date().toISOString(),authenticatedTurns:0,results};
  writeFileSync(".tmp-mel-security-live-proof.json",JSON.stringify(proof,null,2));
  console.log(JSON.stringify(proof,null,2));
  process.exitCode=1;
}
