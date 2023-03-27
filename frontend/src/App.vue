<template>
  <base-layout>
    <section class="chat-room">
      <a-card class="card-chat" hoverable>
        <template #title>
          <span style="color: white">ChatBot</span>
          <a-button
            class="btn-normal btn-change"
            style="margin-left: 20px"
            ghost
            type="primary"
            size="small"
            :loading="isChangeTopicLoading"
            @click="onClickChangeTopic"
            >换个话题</a-button
          >
        </template>
        <ul class="msg-box" ref="msgBoxRef">
          <li
            v-for="(msg, index) in msgList"
            :key="index"
            :class="msg.customClass"
          >
            <div v-if="msg.type == 'sys_msg'">
              <span class="content">{{ msg.content }}</span>
            </div>
            <div v-if="msg.type == 'mine'" class="chat-item-wrap">
              <img src="@/assets/chat-avatar.png" />
              <div class="txt-wrap">
                <span>{{ msg.time }}</span
                >{{ msg.user }}
                <div class="chat-text">
                  <span class="auto-enter" style="text-align: left">{{
                    msg.content
                  }}</span>
                </div>
              </div>
            </div>
            <div v-if="msg.type == 'others'" class="chat-item-wrap">
              <img src="@/assets/chat-avatar.png" />
              <div class="txt-wrap">
                <span>{{ msg.user }}</span
                >{{ msg.time }}
                <div class="chat-text">
                  <span class="auto-enter">
                    <div v-highlight v-html="msg.md_content" />
                  </span>
                </div>
                <!-- <span class="auto-enter">{{ msg.content }}</span>
                </div> -->
              </div>
            </div>
          </li>
        </ul>
        <a-form
          ref="chatFormRef"
          :model="chatForm"
          :rules="chatRules"
          class="form-chat"
        >
          <a-form-item
            name="chatContent"
            class="form-item--content"
            :wrapper-col="{ span: 24 }"
          >
            <a-textarea
              v-model:value="chatForm.chatContent"
              placeholder="输入内容后按Ctrl+Enter或点击发送..."
              :autosize="{ minRows: 2, maxRows: 4 }"
              @keydown="onKeydownChat"
            />
          </a-form-item>
          <a-form-item class="form-item--btn">
            <a-button
              class="btn-normal btn-send"
              ghost
              type="primary"
              size="small"
              :loading="loading"
              @click="sendChatContent"
              >发送</a-button
            >
            <!-- <a-dropdown class="dropdown-send" :trigger="['click', 'hover']">
              <DownOutlined />

              <template #overlay>
                <a-menu>
                  <a-radio-group v-model:value="triggerType">
                    <a-menu-item :key="1">
                      <a-radio :value="1">按Enter键发送消息</a-radio>
                    </a-menu-item>
                    <a-menu-item :key="2">
                      <a-radio :value="2">按Ctrl+Enter键发送消息</a-radio>
                    </a-menu-item>
                  </a-radio-group>
                </a-menu>
              </template>
            </a-dropdown> -->
          </a-form-item>
        </a-form>
      </a-card>
    </section>
  </base-layout>
</template>

<script lang="ts">
declare global {
  interface Window {
    MathJax: any;
  }
}
import { marked } from "marked";
// import "github-markdown-css";
import hljs from "highlight.js";
import {
  defineComponent,
  watch,
  ref,
  reactive,
  nextTick,
  onMounted,
} from "vue";
// import { DownOutlined } from "@ant-design/icons-vue";
import {
  Card,
  Dropdown,
  Form,
  Input,
  Menu,
  message,
  Radio,
} from "ant-design-vue";
import { format } from "@/utils/date-utils";
import { setScrollTop } from "@/utils/dom";
import { useAsyncLoading } from "@/utils/async";
import axios from "axios";
import { any } from "vue-types";

export default defineComponent({
  components: {
    [Dropdown.name]: Dropdown,
    [Menu.name]: Menu,
    [Menu.Item.name]: Menu.Item,
    [Form.name]: Form,
    [Form.Item.name]: Form.Item,
    [Input.name]: Input,
    [Input.TextArea.name]: Input.TextArea,
    [Radio.name]: Radio,
    [Radio.Group.name]: Radio.Group,
    [Card.name]: Card,
  },
  setup() {
    marked.setOptions({
      renderer: new marked.Renderer(),
      highlight: function (code: string, lang: string) {
        const language = hljs.getLanguage(lang) ? lang : "plaintext";
        return hljs.highlight(code, { language }).value;
      },
      langPrefix: "hljs language-",
      pedantic: false,
      gfm: true,
      breaks: true,
      sanitize: false,
      smartLists: true,
      smartypants: false,
      xhtml: false,
    });
    const msgList = ref([
      {
        time: format(new Date(), "HH:mm:ss"),
        user: "Chat AI",
        content: "你好! 我是一个AI机器人",
        md_content: marked.parse(
          "你好! 我是一个基于OPENAI的机器人，已开源：[源码](https://github.com/huanghaozi/chatbot)"
        ),
        type: "others",
        customClass: "others",
      },
    ]);

    const TypeSet = async function () {
      if (!window.MathJax) {
        return;
      }
      window.MathJax.startup.promise = window.MathJax.startup.promise
        .then(() => {
          return window.MathJax.typesetPromise();
        })
        .catch((err: { message: string }) =>
          console.log("Typeset failed: " + err.message)
        );
      return window.MathJax.startup.promise;
    };

    onMounted(() => {
      TypeSet();
    });

    const chatForm = reactive({
      chatContent: "",
    });

    const chatRules = reactive({
      chatContent: [
        { required: true, message: "请输入聊天内容", trigger: "blur" },
      ],
    });

    // 1代表Enter触发，2代表Ctrl+Enter触发
    const triggerType = ref(2);

    const msgBoxRef = ref();

    const chatFormRef = ref();

    const updateScrollTop = () => {
      nextTick(() => {
        const el = msgBoxRef.value;
        const scrollTop = el.scrollHeight - el.clientHeight;
        setScrollTop({
          target: el,
          useAnimation: true,
          targetValue: scrollTop,
        });
      });
    };

    watch(
      () => msgList.value.length,
      () => {
        updateScrollTop();
      }
    );

    const loading = ref(false);

    const sendChatContent = async () => {
      if (chatForm.chatContent.length <= 1) {
        return message.warn("你说得太少，我不明白");
      }
      if (chatForm.chatContent.length >= 2000) {
        return message.warn("我的脑容量不够了，可以少说点吗？");
      }
      await chatFormRef.value.validate();
      loading.value = true;
      msgList.value.push({
        time: format(new Date(), "HH:mm:ss"),
        user: "我说",
        content: chatForm.chatContent,
        md_content: "",
        type: "mine",
        customClass: "mine",
      });
      // 调用 AI 接口
      const es = new EventSource(`./chat?wd=${chatForm.chatContent}`, {
        withCredentials: true,
      });

      let content = "";

      es.onerror = (e) => {
        console.error(e);
        message.error("AI忙不过来了，请稍后重试");
        loading.value = false;
        es.close();
      };

      es.onmessage = (e) => {
        // console.log(JSON.stringify({ msg: e.data }));
        if (e.data === "[DONE]" || e.data === "<|im_end|>") {
          // 数据结束，反馈给服务器
          // chatgptService.feedback(content);
          // if (content) {
          //   session.value.prompt += content;
          // }
          es.close();
          loading.value = false;
          updateScrollTop();
          return;
        }
        // const text = JSON.parse(e.data).choices[0].text;
        const text = e.data.replaceAll("%20", "\n");
        if (text) {
          if (!content) {
            // 第一条数据来了
            msgList.value.push({
              time: format(new Date(), "HH:mm:ss"),
              user: "Chat AI",
              content: text,
              md_content: marked.parse(text),
              type: "others",
              customClass: "others",
            });
            TypeSet();
            content += text;
          } else {
            // 拼接后面的数据
            content += text;
            content = content.replace(/([\r]*?\n)+/g, "\n");
            content = content.replace(/\t/g, "    ");
            // content = content.replace(/^\s+|\s+$/g, "");
            msgList.value[msgList.value.length - 1].content = content;
            msgList.value[msgList.value.length - 1].md_content =
              marked.parse(content);
            TypeSet();
          }
        }
      };

      es.onopen = () => {
        chatFormRef.value.resetFields();
      };
    };

    const onKeydownChat = (e: {
      keyCode: number;
      ctrlKey: any;
      preventDefault: () => void;
    }) => {
      if (loading.value) {
        message.info("机器人正在思考中，请稍候");
        return;
      }
      if (
        (triggerType.value === 1 && e.keyCode === 13) ||
        (triggerType.value === 2 && e.ctrlKey && e.keyCode === 13)
      ) {
        e.preventDefault();
        sendChatContent();
        // sendChatContentV1();
      }
    };

    const handleChangeTopic = async () => {
      // session.value.prompt = "";
      // await chatgptService.changeTopic();
      try {
        await axios.get("./change");
        msgList.value = [
          {
            time: format(new Date(), "HH:mm:ss"),
            user: "Chat AI",
            content: "好的，你想聊什么新的话题？",
            md_content: marked.parse("好的，你想聊什么新的话题？"),
            type: "others",
            customClass: "others",
          },
        ];
        chatForm.chatContent = "";
      } catch {
        message.info("切话题失败，请刷新页面");
      }
    };

    const { trigger: onClickChangeTopic, loading: isChangeTopicLoading } =
      useAsyncLoading(handleChangeTopic);

    return {
      msgBoxRef,
      chatFormRef,
      msgList,
      chatForm,
      chatRules,
      triggerType,
      loading,
      sendChatContent,
      onKeydownChat,
      onClickChangeTopic,
      isChangeTopicLoading,
    };
  },
});
</script>
<style lang="scss" scoped>
.btn-change {
  border-color: white !important;
  color: white !important;
}
.btn-change:hover {
  background-color: #ffffff55 !important;
}
.btn-change:active {
  background-color: #ffffff88 !important;
}

.auto-enter {
  display: inline-block;
  width: 100%;
  word-break: break-all;
  white-space: normal;
  width: fit-content;
}
.msg-box {
  position: relative;
  flex-grow: 1;
  list-style-type: none;
  padding: 12px 18px;
  // min-height: 400px;
  // max-height: 800px;
  height: 30vh;
  overflow: auto;
  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 4px;
    background-color: #ccc;
  }

  &::-webkit-scrollbar-track {
    background: rgba(240, 227, 227, 0.5);
  }
  > li {
    + li {
      margin-top: 10px;
    }
    &.sys_msg {
      text-align: center;
      .content {
        display: inline-block;
        line-height: 30px;
        padding: 0 15px;
        border-radius: 3px;
        background-color: #e2e2e2;
        cursor: default;
        font-size: 14px;
      }
    }
    &.mine {
      text-align: right;
      .chat-item-wrap {
        .txt-wrap {
          padding-right: 60px;
          .chat-text span {
            background-color: #5fb878;
            color: #fff;
            &::after {
              right: -10px;
              border-color: #5fb878 transparent transparent;
            }
          }
        }
        img {
          float: right;
        }
      }
    }
    &.others {
      text-align: left;
      .chat-item-wrap {
        .txt-wrap {
          padding-left: 60px;
          .chat-text span {
            background-color: #e2e2e2;
            color: #000;
            &::after {
              left: -10px;
              border-color: #e2e2e2 transparent transparent;
            }
          }
        }
        img {
          float: left;
        }
      }
    }
  }

  .chat-item-wrap {
    .txt-wrap {
      line-height: 24px;
      font-size: 12px;
      color: #999;
      > span {
        margin-right: 10px;
      }
      .chat-text {
        margin-top: 5px;
        span {
          position: relative;
          display: inline-block;
          border-radius: 4px;
          padding: 8px 15px;
          font-size: 14px;
          &::after {
            content: "";
            position: absolute;
            top: 7px;
            width: 0;
            height: 0;
            border-style: solid dashed dashed;
            overflow: hidden;
            border-width: 10px;
          }
        }
      }
    }
    img {
      width: 40px;
      height: 40px;
      border-radius: 100%;
    }
  }
}

.form-chat {
  display: flex;
  .form-item--content {
    flex: 1;
    margin: 0 16px 0 0;
  }
  .form-item--btn {
    .ant-form-item-control {
      line-height: 1;
    }
  }
}

.btn-normal {
  margin-right: 6px;
}
.btn-send {
  color: #1e90ff !important;
  border-color: #1e90ff !important;
}
.btn-send:hover {
  background-color: #70a1ff !important;
  color: white !important;
}
.btn-send:active {
  background-color: #5352ed !important;
  border-color: #5352ed !important;
}

.dropdown-send {
  display: none;
}

@media screen and (min-width: 768px) {
  .dropdown-send {
    display: inline-block;
  }
}
.card-chat {
  height: 100vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 12px 0 rgb(0 0 0 / 10%);

  .ant-card-head {
    background: #5352ed;
  }

  .ant-card-body {
    padding: 10px;
  }
}

.msg-box {
  position: relative;
  padding: 12px 18px;
  min-height: 400px;
  max-height: 800px;
  overflow: auto;
  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 4px;
    background-color: #ccc;
  }

  &::-webkit-scrollbar-track {
    background: rgba(240, 227, 227, 0.5);
  }
  > li {
    + li {
      margin-top: 10px;
    }
    &.sys_msg {
      text-align: center;
      .content {
        display: inline-block;
        line-height: 30px;
        padding: 0 15px;
        border-radius: 3px;
        background-color: #e2e2e2;
        cursor: default;
        font-size: 14px;
      }
    }
    &.mine {
      text-align: right;
      .chat-item-wrap {
        .txt-wrap {
          padding-right: 60px;
          .chat-text span {
            background-color: #5fb878;
            color: #fff;
            &::after {
              right: -10px;
              border-color: #5fb878 transparent transparent;
            }
          }
        }
        img {
          float: right;
        }
      }
    }
    &.others {
      text-align: left;
      .chat-item-wrap {
        .txt-wrap {
          padding-left: 60px;
          .chat-text span {
            background-color: #e2e2e2;
            color: #000;
            &::after {
              left: -10px;
              border-color: #e2e2e2 transparent transparent;
            }
          }
        }
        img {
          float: left;
        }
      }
    }
  }

  .chat-item-wrap {
    .txt-wrap {
      line-height: 24px;
      font-size: 12px;
      white-space: nowrap;
      color: #999;
      > span {
        margin-right: 10px;
      }
      .chat-text {
        margin-top: 5px;
        span {
          position: relative;
          border-radius: 4px;
          padding: 8px 15px;
          font-size: 14px;
          &::after {
            content: "";
            position: absolute;
            top: 7px;
            width: 0;
            height: 0;
            border-style: solid dashed dashed;
            overflow: hidden;
            border-width: 10px;
          }
        }
      }
    }
    img {
      width: 40px;
      height: 40px;
      border-radius: 100%;
    }
  }
}

.form-chat {
  display: flex;
  .form-item--content {
    flex: 1;
    margin: 0 16px 0 0;
  }
  .form-item--btn {
    .ant-form-item-control {
      line-height: 1;
    }
  }
}

.btn-normal {
  margin-right: 6px;
}

.dropdown-send {
  display: none;
}

@media screen and (min-width: 768px) {
  .dropdown-send {
    display: inline-block;
  }
}
</style>

<style>
p {
  margin-bottom: 0 !important;
}
table {
  margin: 3px;
}
/* Table Head */
thead th {
  background-color: rgb(81, 130, 187);
  color: #fff;
  border-bottom-width: 0;
}

/* Column Style */
td {
  color: #000;
}
/* Heading and Column Style */
tr,
th {
  border-width: 1px;
  border-style: solid;
  border-color: rgb(81, 130, 187);
}

/* Padding and font style */
td,
th {
  padding: 5px 10px;
  font-size: 12px;
  font-family: Verdana;
  font-weight: bold;
}
pre {
  position: relative;
}
pre code {
  font-family: "Consolas", "Courier New", monospace, sans-serif !important;
}
.hljsln {
  display: block;
  margin-left: 2.4em;
  padding-left: 0.7em !important;
}
.hljsln::-webkit-scrollbar {
  height: 15px;
}
.hljsln::-webkit-scrollbar-thumb {
  background: #666;
}
.hljsln::-webkit-scrollbar-thumb:hover {
  background: #797979;
}
.hljsln::-webkit-scrollbar-thumb:active {
  background: #949494;
}
.hljsln .ln-bg {
  position: absolute;
  z-index: 1;
  top: 0;
  left: 0;
  width: 2.4em;
  height: 100%;
  background: #333;
}
.hljsln .ln-num {
  position: absolute;
  z-index: 2;
  left: 0;
  width: 2.4em;
  height: 1em;
  text-align: center;
  display: inline-block;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}
.hljsln .ln-num::before {
  color: #777;
  font-style: normal;
  font-weight: normal;
  content: attr(data-num);
}
.hljsln .ln-eof {
  display: inline-block;
}
</style>

<style lang="scss">
.card-chat {
  box-shadow: 0 2px 12px 0 rgb(0 0 0 / 10%);

  .ant-card-head {
    background: #5352ed;
  }

  .ant-card-head-title {
    display: flex;
    align-items: center;
    white-space: normal;
    > span {
      flex: 1;
    }
  }

  .ant-card-body {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    padding: 10px;
  }
}
</style>
