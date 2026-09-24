import { createCn } from "cn/config"

export const cn = createCn({
  extend: {
    theme: {
      shadow: ["underline", "glow", "glow-sm"],
      text: ["caption", "title", "display"],
    },
  },
})
