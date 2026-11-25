const express = require("express");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;
const publicDir = __dirname;
app.disable("x-powered-by");
app.use((req,res,next)=>{
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("Referrer-Policy","strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options","DENY");
  res.setHeader("Permissions-Policy","camera=(), microphone=(), geolocation=()");
  next();
});
app.use(express.static(publicDir, { extensions:["html"], maxAge:"1h" }));
app.get("/health", (_req,res)=>res.status(200).json({status:"ok",service:"FritzCash"}));
app.get("*", (req,res,next)=>{
  if(req.path.startsWith("/api/")) return res.status(404).json({error:"Not found"});
  res.sendFile(path.join(publicDir,"index.html"));
});
app.listen(PORT,"0.0.0.0",()=>console.log(`FritzCash running on ${PORT}`));
