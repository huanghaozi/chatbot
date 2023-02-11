import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";

import Antd from "ant-design-vue";
import "ant-design-vue/dist/antd.css";
import "./assets/fonts/font.css";

const app = createApp(App);
app.use(Antd);
app.use(createPinia());

app.mount("#app");
