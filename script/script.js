/* =========================================================
   YonnAssistant Script
========================================================= */

/* =========================================================
   ACTIVE CHAT ELEMENTS
========================================================= */

const isMobile = window.innerWidth <= 768;

const chatBody = isMobile
  ? document.querySelector(".mobile-chat-body")
  : document.querySelector(".chat-body");

const messageInput = isMobile
  ? document.querySelector(".mobile-message-input")
  : document.querySelector(".message-input");

const sendMessageButton = isMobile
  ? document.querySelector(".mobile-chat-form button")
  : document.querySelector("#send-message");

/* =========================================================
   DESKTOP ELEMENTS
========================================================= */

const chatbotToggler =
  document.querySelector("#chatbot-toggler");

const closeChatbot =
  document.querySelector("#close-chatbot");

const welcomeChatBtn =
  document.querySelector("#welcome-chat-btn");

const sidebarChatbotToggler =
  document.querySelector("#sidebar-chatbot-toggler");

/* =========================================================
   MOBILE ELEMENTS
========================================================= */

const mobileMenuToggler =
  document.querySelector("#mobile-menu-toggler");

const mobileChatBtn =
  document.querySelector("#mobile-chat-btn");

const closeMobileChat =
  document.querySelector("#close-mobile-chat");

/* =========================================================
   FILE & EMOJI
========================================================= */

const fileInput =
  document.querySelector("#file-input");

const emojiPickerButton =
  document.querySelector("#emoji-picker");

/* =========================================================
   API SETUP
========================================================= */

const API_KEY =
  "AIzaSyAygVSmNUQXdkdXw08oa11Wyzy0utqBHDY"

const API_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${API_KEY}`;

/* =========================================================
   USER DATA
========================================================= */

const userData = {

  message: null,

  file: {
    data: null,
    mime_type: null,
  },

};

const chatHistory = [];

const initialInputHeight =
  messageInput
    ? messageInput.scrollHeight
    : 0;

/* =========================================================
   CREATE MESSAGE
========================================================= */

const createMessageElement = (
  content,
  ...classes
) => {

  const div = document.createElement("div");

  div.classList.add(
    "message",
    ...classes
  );

  div.innerHTML = content;

  return div;

};

/* =========================================================
   GENERATE BOT RESPONSE
========================================================= */

const generateBotResponse =
async (incomingMessageDiv) => {

  const messageElement =
    incomingMessageDiv.querySelector(
      ".message-text"
    );

  chatHistory.push({

    role: "user",

    parts: [

      {
        text: userData.message
      },

      ...(userData.file.data
        ? [{
            inline_data: userData.file
          }]
        : []),

    ],

  });

  const requestOptions = {

    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({

      contents: chatHistory,

    }),

  };

  try {

    const response =
      await fetch(API_URL, requestOptions);

    const data =
      await response.json();

    if(!response.ok)
      throw new Error(
        data.error.message
      );

    const apiResponseText =
      data.candidates[0]
      .content.parts[0]
      .text
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .trim();

    messageElement.innerText =
      apiResponseText;

    chatHistory.push({

      role: "model",

      parts: [
        {
          text: apiResponseText
        }
      ],

    });

  } catch(error){

    console.log(error);

    messageElement.innerText =
      error.message;

    messageElement.style.color =
      "#ff0000";

  } finally {

    incomingMessageDiv.classList.remove(
      "thinking"
    );

    chatBody.scrollTo({

      top: chatBody.scrollHeight,

      behavior: "smooth",

    });

  }

};

/* =========================================================
   SEND MESSAGE
========================================================= */

const handleOutgoingMessage = (e) => {

  e.preventDefault();

  userData.message =
    messageInput.value.trim();

  if(!userData.message) return;

  messageInput.value = "";

  messageInput.dispatchEvent(
    new Event("input")
  );

  const messageContent = `
    <div class="message-text"></div>

    ${
      userData.file.data
      ?
      `<img
        src="data:${userData.file.mime_type};base64,${userData.file.data}"
        class="attachment"
      />`
      :
      ""
    }
  `;

  const outgoingMessageDiv =
    createMessageElement(
      messageContent,
      "user-message"
    );

  outgoingMessageDiv
    .querySelector(".message-text")
    .textContent =
      userData.message;

  chatBody.appendChild(
    outgoingMessageDiv
  );

  chatBody.scrollTo({

    top: chatBody.scrollHeight,

    behavior: "smooth",

  });

  setTimeout(() => {

    const messageContent = `

      <svg
        class="bot-avatar"
        xmlns="http://www.w3.org/2000/svg"
        width="50"
        height="50"
        viewBox="0 0 1024 1024">

        <path
          d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9z">
        </path>

      </svg>

      <div class="message-text">

        <div class="thinking-indicator">

          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>

        </div>

      </div>

    `;

    const incomingMessageDiv =
      createMessageElement(
        messageContent,
        "bot-message",
        "thinking"
      );

    chatBody.appendChild(
      incomingMessageDiv
    );

    chatBody.scrollTo({

      top: chatBody.scrollHeight,

      behavior: "smooth",

    });

    generateBotResponse(
      incomingMessageDiv
    );

  }, 600);

};

/* =========================================================
   ENTER SEND
========================================================= */

if(messageInput){

  messageInput.addEventListener(
    "keydown",
    (e) => {

      const userMessage =
        e.target.value.trim();

      if(
        e.key === "Enter"
        &&
        userMessage
        &&
        !e.shiftKey
      ){

        handleOutgoingMessage(e);

      }

    }
  );

}

/* =========================================================
   AUTO RESIZE INPUT
========================================================= */

if(messageInput){

  messageInput.addEventListener(
    "input",
    () => {

      messageInput.style.height =
        `${initialInputHeight}px`;

      messageInput.style.height =
        `${messageInput.scrollHeight}px`;

    }
  );

}

/* =========================================================
   SEND BUTTON
========================================================= */

if(sendMessageButton){

  sendMessageButton.addEventListener(
    "click",
    (e) => handleOutgoingMessage(e)
  );

}

/* =========================================================
   FILE UPLOAD
========================================================= */

if(fileInput){

  fileInput.addEventListener(
    "change",
    () => {

      const file =
        fileInput.files[0];

      if(!file) return;

      const reader =
        new FileReader();

      reader.onload = (e) => {

        const base64String =
          e.target.result
          .split(",")[1];

        userData.file = {

          data: base64String,

          mime_type: file.type,

        };

        fileInput.value = "";

      };

      reader.readAsDataURL(file);

    }
  );

}

/* =========================================================
   EMOJI PICKER
========================================================= */

if(
  window.EmojiMart?.Picker
  &&
  emojiPickerButton
){

  const picker =
    new EmojiMart.Picker({

      theme: "light",

      skinTonePosition: "none",

      preview: "none",

      onEmojiSelect: (emoji) => {

        const {
          selectionStart: start,
          selectionEnd: end
        } = messageInput;

        messageInput.setRangeText(
          emoji.native,
          start,
          end,
          "end"
        );

        messageInput.focus();

      },

    });

  const form = isMobile
    ?
    document.querySelector(".mobile-chat-form")
    :
    document.querySelector(".chat-form");

  form.appendChild(picker);

}

/* =========================================================
   DESKTOP CHAT OPEN
========================================================= */

if(chatbotToggler){

  chatbotToggler.addEventListener(
    "click",
    () => {

      document.body.classList.toggle(
        "show-chatbot"
      );

    }
  );

}

if(welcomeChatBtn){

  welcomeChatBtn.addEventListener(
    "click",
    () => {

      document.body.classList.add(
        "show-chatbot"
      );

    }
  );

}

if(sidebarChatbotToggler){

  sidebarChatbotToggler.addEventListener(
    "click",
    () => {

      document.body.classList.add(
        "show-chatbot"
      );

    }
  );

}

if(closeChatbot){

  closeChatbot.addEventListener(
    "click",
    () => {

      document.body.classList.remove(
        "show-chatbot"
      );

    }
  );

}

/* =========================================================
   MOBILE MENU
========================================================= */

if(mobileMenuToggler){

  mobileMenuToggler.addEventListener(
    "click",
    () => {

      document.body.classList.toggle(
        "show-mobile-menu"
      );

    }
  );

}

/* =========================================================
   MOBILE CHAT OPEN
========================================================= */

if(mobileChatBtn){

  mobileChatBtn.addEventListener(
    "click",
    () => {

      document.body.classList.remove(
        "show-mobile-menu"
      );

      document.body.classList.add(
        "show-mobile-chat"
      );

    }
  );

}

/* =========================================================
   MOBILE CHAT CLOSE
========================================================= */

if(closeMobileChat){

  closeMobileChat.addEventListener(
    "click",
    () => {

      document.body.classList.remove(
        "show-mobile-chat"
      );

    }
  );

}

/* =========================================================
   CLOSE MENU CLICK OUTSIDE
========================================================= */

document.addEventListener(
  "click",
  (e) => {

    const mobileMenu =
      document.querySelector(
        ".mobile-menu"
      );

    if(
      document.body.classList.contains(
        "show-mobile-menu"
      )
    ){

      if(
        mobileMenu
        &&
        !mobileMenu.contains(e.target)
        &&
        !mobileMenuToggler.contains(e.target)
      ){

        document.body.classList.remove(
          "show-mobile-menu"
        );

      }

    }

  }
);