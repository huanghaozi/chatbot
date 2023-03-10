import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";

import Antd from "ant-design-vue";
import "ant-design-vue/dist/antd.css";
import "./assets/fonts/font.css";
import hljs from "highlight.js";
import "highlight.js/styles/atom-one-dark.css";

function addLineNumbersForCode(html: string) {
  let num = 1;
  if (/\r|\n$/.test(html)) {
    html += '<span class="ln-eof"></span>';
  }
  html = html.replace(/\r\n|\r|\n/g, function (a: string) {
    num++;
    const text = ("  " + num).substr(-3);
    return a + '<span class="ln-num" data-num="' + text + '"></span>';
  });
  html = '<span class="ln-num" data-num="  1"></span>' + html;
  html = '<span class="ln-bg"></span>' + html;
  return html;
}

const app = createApp(App);
app.directive("highlight", function (el) {
  console.log("自定义指令", el);

  const elements = el.querySelectorAll("pre code");
  for (let i = 0; i < elements.length; i++) {
    if (elements[i].className.indexOf("hljsln") == -1) {
      let html = elements[i].innerHTML;
      html = addLineNumbersForCode(html);
      elements[i].innerHTML = html;
      elements[i].className += " hljsln";
    }
  }
  console.log(elements);
});
app.use(hljs.vuePlugin);
app.use(Antd);
app.use(createPinia());

app.mount("#app");
