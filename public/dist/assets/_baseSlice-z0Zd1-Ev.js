function u(f,i,e){var c=-1,l=f.length;i<0&&(i=-i>l?0:l+i),e=e>l?l:e,e<0&&(e+=l),l=i>e?0:e-i>>>0,i>>>=0;for(var h=Array(l);++c<l;)h[c]=f[c+i];return h}var v=u;export{v as _};
