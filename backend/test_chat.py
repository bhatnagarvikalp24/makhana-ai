"""
Quick test script for Chat Agent functionality
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from chat_agent import DietChatAgent

def test_chat_agent():
    """Test basic chat agent functionality"""

    # Check if API key is set
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        print("❌ ANTHROPIC_API_KEY not found in environment")
        print("Please set it in your .env file or export it")
        return False

    print("✅ ANTHROPIC_API_KEY found")

    try:
        # Initialize agent
        print("\n📝 Initializing chat agent...")
        agent = DietChatAgent()
        print("✅ Chat agent initialized successfully")

        # Test basic chat
        print("\n💬 Testing basic conversation...")
        session_id = "test_session_123"

        # First message
        response1 = agent.chat(
            session_id=session_id,
            user_message="What are good protein sources for vegetarians?",
            context={
                "goal": "weight_loss",
                "dietary_preferences": "vegetarian",
                "daily_calories": "1800 kcal/day"
            }
        )

        print(f"\n🤖 AI Response 1:")
        print(response1)
        print("\n" + "="*60)

        # Second message (should remember context)
        response2 = agent.chat(
            session_id=session_id,
            user_message="Can you suggest a meal plan using those foods?"
        )

        print(f"\n🤖 AI Response 2:")
        print(response2)
        print("\n" + "="*60)

        # Test conversation history
        print("\n📜 Testing conversation history...")
        history = agent.get_conversation_history(session_id)
        print(f"✅ Retrieved {len(history)} messages in conversation")

        # Test suggestions
        print("\n💡 Testing quick suggestions...")
        suggestions = agent.get_quick_suggestions({
            "goal": "weight_loss"
        })
        print(f"✅ Generated {len(suggestions)} suggestions:")
        for i, suggestion in enumerate(suggestions, 1):
            print(f"   {i}. {suggestion}")

        # Clear session
        print("\n🗑️  Testing session cleanup...")
        cleared = agent.clear_session(session_id)
        print(f"✅ Session cleared: {cleared}")

        print("\n" + "="*60)
        print("🎉 All tests passed successfully!")
        print("="*60)

        return True

    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("="*60)
    print("Testing Conversational AI Chat Agent")
    print("="*60)

    success = test_chat_agent()

    if success:
        print("\n✨ Chat agent is ready to use!")
        print("\nNext steps:")
        print("1. Start the backend: uvicorn main:app --reload")
        print("2. Start the frontend: npm run dev")
        print("3. Open the Dashboard and click the chat button")
    else:
        print("\n⚠️  Please fix the errors above before using the chat feature")
