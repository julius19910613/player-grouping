#!/bin/bash

# 测试聊天上下文功能
echo "🧪 测试聊天上下文功能..."
echo ""

# 测试 1: 发送第一条消息
echo "📝 测试 1: 发送第一条消息"
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "你好，我叫 Julius"}
    ],
    "enableFunctionCalling": true,
    "stream": false
  }' | jq .

echo ""
echo "---"
echo ""

# 测试 2: 发送第二条消息，测试上下文
echo "📝 测试 2: 发送第二条消息（测试上下文记忆）"
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "你好，我叫 Julius"},
      {"role": "assistant", "content": "你好 Julius！很高兴认识你。有什么我可以帮助你的吗？"},
      {"role": "user", "content": "你还记得我的名字吗？"}
    ],
    "enableFunctionCalling": true,
    "stream": false
  }' | jq .

echo ""
echo "✅ 测试完成！"
