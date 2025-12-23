"""
Conversational AI Chat Agent for Diet Plan Assistance
Uses LangChain with Anthropic Claude for natural conversations
"""

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.chat_history import InMemoryChatMessageHistory
from typing import List, Dict, Optional
import os
from datetime import datetime

class DietChatAgent:
    """
    Conversational AI agent for helping users with diet-related questions.
    Maintains conversation history per user session.
    """

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the chat agent with Claude API

        Args:
            api_key: Anthropic API key (defaults to ANTHROPIC_API_KEY env var)
        """
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable not set")

        # Initialize Claude chat model
        # Using Claude 3 Haiku (fastest, most cost-effective for chat)
        self.llm = ChatAnthropic(
            model="claude-3-haiku-20240307",
            anthropic_api_key=self.api_key,
            temperature=0.7,
            max_tokens=800,  # Reduced tokens for faster responses
            timeout=90.0,  # 90 second timeout for API requests
            max_retries=4  # Retry failed requests up to 4 times
        )

        # Store conversation histories per session
        self.sessions: Dict[str, InMemoryChatMessageHistory] = {}

        # System prompt for the diet assistant
        self.system_prompt = """You are a helpful, friendly AI diet and nutrition assistant.
Your role is to:
- Answer questions about the user's diet plan
- Provide nutritional advice and healthy eating tips
- Suggest meal ideas and alternatives
- Explain why certain foods are beneficial
- Help users understand macros (protein, carbs, fats)
- Give motivation and encouragement for their health journey
- Answer questions about meal prep, cooking, and grocery shopping

Keep responses concise, friendly, and actionable. Use emojis occasionally to keep it engaging.
If asked about medical conditions, remind users to consult healthcare professionals.
Stay focused on diet, nutrition, and wellness topics."""

    def get_or_create_session(self, session_id: str) -> InMemoryChatMessageHistory:
        """Get existing session or create new one"""
        if session_id not in self.sessions:
            self.sessions[session_id] = InMemoryChatMessageHistory()
            # Add system message at the start
            self.sessions[session_id].add_message(SystemMessage(content=self.system_prompt))
        return self.sessions[session_id]

    def chat(self, session_id: str, user_message: str, context: Optional[Dict] = None) -> str:
        """
        Send a message and get AI response

        Args:
            session_id: Unique identifier for conversation session (e.g., user_id or plan_id)
            user_message: The user's message/question
            context: Optional context about user's diet plan, goals, etc.

        Returns:
            AI response string
        """
        # Get conversation history
        history = self.get_or_create_session(session_id)

        # Add context if provided (prepend to user message)
        enhanced_message = user_message
        if context:
            context_str = self._format_context(context)
            enhanced_message = f"[User Context: {context_str}]\n\nUser Question: {user_message}"

        # Add user message to history
        history.add_message(HumanMessage(content=enhanced_message))

        # Get all messages for the LLM
        messages = history.messages

        # Get AI response with retry logic for temporary API errors
        max_retries = 2  # Reduced since ChatAnthropic already has max_retries=4
        retry_delay = 1  # Faster retry (1 second instead of 2)

        for attempt in range(max_retries):
            try:
                response = self.llm.invoke(messages)
                ai_message = response.content

                # Add AI response to history
                history.add_message(AIMessage(content=ai_message))

                return ai_message

            except Exception as e:
                error_str = str(e).lower()

                # Check if it's a retryable error
                retryable_errors = [
                    "overloaded", "529",  # API overload
                    "connection", "timeout",  # Connection issues
                    "rate limit", "429"  # Rate limiting
                ]

                is_retryable = any(err in error_str for err in retryable_errors)

                if is_retryable and attempt < max_retries - 1:
                    # Wait and retry
                    import time
                    time.sleep(retry_delay)
                    continue
                elif is_retryable:
                    # Max retries reached for retryable error
                    if "overloaded" in error_str or "529" in error_str:
                        error_msg = "I'm experiencing high demand right now. Please try again in a moment! 🙏"
                    elif "timeout" in error_str or "connection" in error_str:
                        error_msg = "Connection timeout. The AI service is responding slowly. Please try again! ⏱️"
                    else:
                        error_msg = "The AI service is temporarily unavailable. Please try again shortly! 🔄"
                else:
                    # Non-retryable error
                    error_msg = f"Sorry, I encountered an error: {str(e)}"
                    break

        history.add_message(AIMessage(content=error_msg))
        return error_msg

    def _format_context(self, context: Dict) -> str:
        """Format diet plan context for better AI understanding"""
        parts = []

        if "goal" in context:
            parts.append(f"Goal: {context['goal']}")
        if "daily_calories" in context:
            parts.append(f"Daily Calories: {context['daily_calories']}")
        if "current_weight" in context:
            parts.append(f"Current Weight: {context['current_weight']}kg")
        if "target_weight" in context:
            parts.append(f"Target Weight: {context['target_weight']}kg")
        if "dietary_preferences" in context:
            parts.append(f"Diet Type: {context['dietary_preferences']}")
        if "medical_issues" in context and context['medical_issues'] != "None":
            parts.append(f"Medical Considerations: {context['medical_issues']}")

        return ", ".join(parts)

    def get_conversation_history(self, session_id: str) -> List[Dict[str, str]]:
        """
        Get conversation history in a clean format

        Returns:
            List of messages with role and content
        """
        if session_id not in self.sessions:
            return []

        history = self.sessions[session_id]
        messages = []

        for msg in history.messages:
            # Skip system messages
            if isinstance(msg, SystemMessage):
                continue

            role = "user" if isinstance(msg, HumanMessage) else "assistant"
            messages.append({
                "role": role,
                "content": msg.content
            })

        return messages

    def clear_session(self, session_id: str) -> bool:
        """Clear conversation history for a session"""
        if session_id in self.sessions:
            del self.sessions[session_id]
            return True
        return False

    def get_quick_suggestions(self, context: Optional[Dict] = None) -> List[str]:
        """
        Get suggested questions based on user context

        Returns:
            List of suggested question strings
        """
        if context and context.get("goal") == "weight_loss":
            return [
                "How can I deal with hunger cravings?",
                "What are good low-calorie snacks?",
                "Can I eat out while following this plan?",
                "How much water should I drink daily?"
            ]
        elif context and context.get("goal") == "muscle_gain":
            return [
                "What are the best protein sources?",
                "Should I eat before or after workout?",
                "How important is meal timing?",
                "Can I build muscle on a vegetarian diet?"
            ]
        else:
            return [
                "Can you explain my macros?",
                "What are healthy alternatives to sugar?",
                "How do I meal prep efficiently?",
                "What should I do if I miss a meal?"
            ]


# Global instance (FastAPI will use this)
chat_agent = None

def get_chat_agent() -> DietChatAgent:
    """Get or create global chat agent instance"""
    global chat_agent
    if chat_agent is None:
        chat_agent = DietChatAgent()
    return chat_agent
