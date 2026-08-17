console.log("Testing mathjax4arabic import...");
import('mathjax4arabic').then((m) => {
  console.log(m.default);
}).catch(console.error);
