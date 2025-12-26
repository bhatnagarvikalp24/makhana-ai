"""
Smart Grocery Price Optimizer Agent
Monitors prices, suggests swaps, saves money autonomously
"""

import os
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from anthropic import Anthropic

# Initialize Anthropic client
anthropic_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


# Nutritional equivalence database
# Maps ingredients to their nutritionally similar alternatives
NUTRITIONAL_EQUIVALENTS = {
    "paneer": {
        "alternatives": ["tofu", "cottage cheese", "greek yogurt", "boiled eggs"],
        "macro_profile": {"protein": 18, "carbs": 1, "fat": 20, "calories": 265},
        "nutrition_type": "high_protein_dairy"
    },
    "chicken breast": {
        "alternatives": ["turkey breast", "fish fillet", "tofu", "paneer", "chickpeas"],
        "macro_profile": {"protein": 31, "carbs": 0, "fat": 3.6, "calories": 165},
        "nutrition_type": "lean_protein"
    },
    "avocado": {
        "alternatives": ["peanut butter", "almonds", "olive oil", "flaxseeds"],
        "macro_profile": {"protein": 2, "carbs": 9, "fat": 15, "calories": 160},
        "nutrition_type": "healthy_fats"
    },
    "quinoa": {
        "alternatives": ["brown rice", "oats", "daliya", "whole wheat"],
        "macro_profile": {"protein": 8, "carbs": 39, "fat": 3, "calories": 222},
        "nutrition_type": "complex_carbs"
    },
    "almonds": {
        "alternatives": ["walnuts", "cashews", "peanuts", "sunflower seeds"],
        "macro_profile": {"protein": 21, "carbs": 22, "fat": 49, "calories": 579},
        "nutrition_type": "nuts_healthy_fats"
    },
    "salmon": {
        "alternatives": ["mackerel", "sardines", "tuna", "flaxseeds", "chia seeds"],
        "macro_profile": {"protein": 25, "carbs": 0, "fat": 13, "calories": 208},
        "nutrition_type": "omega3_protein"
    },
    "greek yogurt": {
        "alternatives": ["hung curd", "paneer", "tofu", "cottage cheese"],
        "macro_profile": {"protein": 10, "carbs": 4, "fat": 5, "calories": 100},
        "nutrition_type": "probiotic_protein"
    },
    "spinach": {
        "alternatives": ["kale", "methi", "broccoli", "cabbage"],
        "macro_profile": {"protein": 3, "carbs": 4, "fat": 0, "calories": 23},
        "nutrition_type": "leafy_greens"
    },
    "sweet potato": {
        "alternatives": ["regular potato", "pumpkin", "carrots", "beetroot"],
        "macro_profile": {"protein": 2, "carbs": 20, "fat": 0, "calories": 86},
        "nutrition_type": "complex_carbs_vitamins"
    },
    "oats": {
        "alternatives": ["daliya", "quinoa", "brown rice", "whole wheat"],
        "macro_profile": {"protein": 17, "carbs": 66, "fat": 7, "calories": 389},
        "nutrition_type": "fiber_complex_carbs"
    }
}


# Simulated price database (in production, this would be scraped from real APIs)
# Prices in INR per 100g/100ml
PRICE_DATABASE = {
    "paneer": {"price": 80, "unit": "100g", "source": "blinkit", "last_updated": datetime.now()},
    "tofu": {"price": 45, "unit": "100g", "source": "bigbasket", "last_updated": datetime.now()},
    "cottage cheese": {"price": 60, "unit": "100g", "source": "blinkit", "last_updated": datetime.now()},
    "greek yogurt": {"price": 70, "unit": "100g", "source": "blinkit", "last_updated": datetime.now()},
    "boiled eggs": {"price": 10, "unit": "1pc", "source": "local", "last_updated": datetime.now()},

    "chicken breast": {"price": 35, "unit": "100g", "source": "blinkit", "last_updated": datetime.now()},
    "turkey breast": {"price": 55, "unit": "100g", "source": "bigbasket", "last_updated": datetime.now()},
    "fish fillet": {"price": 50, "unit": "100g", "source": "blinkit", "last_updated": datetime.now()},
    "chickpeas": {"price": 12, "unit": "100g", "source": "local", "last_updated": datetime.now()},

    "avocado": {"price": 150, "unit": "1pc", "source": "blinkit", "last_updated": datetime.now()},
    "peanut butter": {"price": 40, "unit": "100g", "source": "bigbasket", "last_updated": datetime.now()},
    "almonds": {"price": 90, "unit": "100g", "source": "blinkit", "last_updated": datetime.now()},
    "olive oil": {"price": 60, "unit": "100ml", "source": "bigbasket", "last_updated": datetime.now()},
    "flaxseeds": {"price": 30, "unit": "100g", "source": "local", "last_updated": datetime.now()},

    "quinoa": {"price": 80, "unit": "100g", "source": "bigbasket", "last_updated": datetime.now()},
    "brown rice": {"price": 25, "unit": "100g", "source": "blinkit", "last_updated": datetime.now()},
    "oats": {"price": 20, "unit": "100g", "source": "blinkit", "last_updated": datetime.now()},
    "daliya": {"price": 18, "unit": "100g", "source": "local", "last_updated": datetime.now()},
    "whole wheat": {"price": 15, "unit": "100g", "source": "local", "last_updated": datetime.now()},

    "walnuts": {"price": 120, "unit": "100g", "source": "blinkit", "last_updated": datetime.now()},
    "cashews": {"price": 100, "unit": "100g", "source": "blinkit", "last_updated": datetime.now()},
    "peanuts": {"price": 25, "unit": "100g", "source": "local", "last_updated": datetime.now()},
    "sunflower seeds": {"price": 35, "unit": "100g", "source": "local", "last_updated": datetime.now()},

    "salmon": {"price": 180, "unit": "100g", "source": "bigbasket", "last_updated": datetime.now()},
    "mackerel": {"price": 80, "unit": "100g", "source": "blinkit", "last_updated": datetime.now()},
    "sardines": {"price": 60, "unit": "100g", "source": "blinkit", "last_updated": datetime.now()},
    "tuna": {"price": 100, "unit": "100g", "source": "bigbasket", "last_updated": datetime.now()},
    "chia seeds": {"price": 50, "unit": "100g", "source": "bigbasket", "last_updated": datetime.now()},

    "hung curd": {"price": 55, "unit": "100g", "source": "blinkit", "last_updated": datetime.now()},

    "kale": {"price": 40, "unit": "100g", "source": "bigbasket", "last_updated": datetime.now()},
    "methi": {"price": 15, "unit": "100g", "source": "local", "last_updated": datetime.now()},
    "spinach": {"price": 20, "unit": "100g", "source": "local", "last_updated": datetime.now()},
    "broccoli": {"price": 35, "unit": "100g", "source": "blinkit", "last_updated": datetime.now()},
    "cabbage": {"price": 12, "unit": "100g", "source": "local", "last_updated": datetime.now()},

    "sweet potato": {"price": 30, "unit": "100g", "source": "blinkit", "last_updated": datetime.now()},
    "regular potato": {"price": 15, "unit": "100g", "source": "local", "last_updated": datetime.now()},
    "pumpkin": {"price": 18, "unit": "100g", "source": "local", "last_updated": datetime.now()},
    "carrots": {"price": 20, "unit": "100g", "source": "local", "last_updated": datetime.now()},
    "beetroot": {"price": 22, "unit": "100g", "source": "local", "last_updated": datetime.now()},
}


def get_ingredient_price(ingredient: str) -> Optional[Dict]:
    """Get current price for an ingredient"""
    ingredient_lower = ingredient.lower().strip()
    return PRICE_DATABASE.get(ingredient_lower)


def find_cheaper_alternatives(ingredient: str, max_price_ratio: float = 0.8) -> List[Dict]:
    """
    Find nutritionally equivalent alternatives that are cheaper

    Args:
        ingredient: The ingredient to find alternatives for
        max_price_ratio: Only return alternatives cheaper than this ratio (0.8 = 80% of original)

    Returns:
        List of alternatives with price savings
    """
    ingredient_lower = ingredient.lower().strip()

    # Check if ingredient exists in equivalents database
    if ingredient_lower not in NUTRITIONAL_EQUIVALENTS:
        return []

    original_price = get_ingredient_price(ingredient_lower)
    if not original_price:
        return []

    alternatives_data = NUTRITIONAL_EQUIVALENTS[ingredient_lower]
    cheaper_alternatives = []

    for alt in alternatives_data["alternatives"]:
        alt_price = get_ingredient_price(alt)
        if not alt_price:
            continue

        # Calculate price ratio
        price_ratio = alt_price["price"] / original_price["price"]

        if price_ratio <= max_price_ratio:
            savings = original_price["price"] - alt_price["price"]
            savings_percent = ((original_price["price"] - alt_price["price"]) / original_price["price"]) * 100

            cheaper_alternatives.append({
                "alternative": alt,
                "original_price": original_price["price"],
                "alternative_price": alt_price["price"],
                "savings": savings,
                "savings_percent": round(savings_percent, 1),
                "nutrition_type": alternatives_data["nutrition_type"],
                "source": alt_price["source"]
            })

    # Sort by savings (highest first)
    cheaper_alternatives.sort(key=lambda x: x["savings"], reverse=True)

    return cheaper_alternatives


def analyze_grocery_list_with_ai(grocery_list: List[str], user_goal: str = "weight_loss") -> Dict:
    """
    Use AI to analyze grocery list and suggest optimizations

    Args:
        grocery_list: List of ingredients in user's grocery
        user_goal: User's dietary goal (weight_loss, muscle_gain, budget, etc.)

    Returns:
        AI analysis with swap suggestions
    """
    # Find all possible swaps
    all_swaps = {}
    total_original_cost = 0
    total_optimized_cost = 0

    for ingredient in grocery_list:
        price_info = get_ingredient_price(ingredient)
        if price_info:
            total_original_cost += price_info["price"]

        alternatives = find_cheaper_alternatives(ingredient)
        if alternatives:
            all_swaps[ingredient] = alternatives
            # Use best alternative for cost calculation
            total_optimized_cost += alternatives[0]["alternative_price"]
        else:
            if price_info:
                total_optimized_cost += price_info["price"]

    # Prepare AI prompt
    swaps_summary = json.dumps(all_swaps, indent=2)

    prompt = f"""You are a smart grocery optimization agent. Analyze this grocery list and suggest swaps to save money while maintaining nutrition.

User's Goal: {user_goal}
Grocery List: {', '.join(grocery_list)}

Available Cheaper Alternatives:
{swaps_summary}

Original Total Cost: ₹{total_original_cost}
Optimized Total Cost: ₹{total_optimized_cost}
Potential Savings: ₹{total_original_cost - total_optimized_cost}

Provide:
1. Top 3 recommended swaps with reasoning
2. Total savings if all swaps are made
3. Any nutrition considerations
4. Personalized advice based on user goal

Be conversational, friendly, and money-conscious. Format as JSON with keys:
- recommended_swaps: [{{original, replacement, reason, savings}}]
- total_savings: number
- nutrition_notes: string
- personalized_advice: string
"""

    try:
        message = anthropic_client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1500,
            messages=[{
                "role": "user",
                "content": prompt
            }]
        )

        response_text = message.content[0].text

        # Try to parse JSON from response
        # Look for JSON block
        if "```json" in response_text:
            json_start = response_text.find("```json") + 7
            json_end = response_text.find("```", json_start)
            json_str = response_text[json_start:json_end].strip()
        elif "{" in response_text and "}" in response_text:
            json_start = response_text.find("{")
            json_end = response_text.rfind("}") + 1
            json_str = response_text[json_start:json_end]
        else:
            json_str = response_text

        ai_response = json.loads(json_str)

        return {
            "success": True,
            "ai_analysis": ai_response,
            "all_possible_swaps": all_swaps,
            "original_cost": total_original_cost,
            "optimized_cost": total_optimized_cost,
            "max_savings": total_original_cost - total_optimized_cost
        }

    except Exception as e:
        print(f"AI analysis error: {e}")

        # Fallback: return basic swap suggestions
        top_swaps = []
        for ing, alternatives in list(all_swaps.items())[:3]:
            if alternatives:
                best_alt = alternatives[0]
                top_swaps.append({
                    "original": ing,
                    "replacement": best_alt["alternative"],
                    "reason": f"Save ₹{best_alt['savings']} ({best_alt['savings_percent']}% cheaper)",
                    "savings": best_alt["savings"]
                })

        return {
            "success": True,
            "ai_analysis": {
                "recommended_swaps": top_swaps,
                "total_savings": total_original_cost - total_optimized_cost,
                "nutrition_notes": "All alternatives maintain similar nutritional profiles.",
                "personalized_advice": "Focus on swapping expensive items first for maximum savings!"
            },
            "all_possible_swaps": all_swaps,
            "original_cost": total_original_cost,
            "optimized_cost": total_optimized_cost,
            "max_savings": total_original_cost - total_optimized_cost
        }


def auto_optimize_grocery_list(grocery_list: List[str], budget_mode: bool = False) -> Dict:
    """
    Automatically swap expensive items for cheaper alternatives

    Args:
        grocery_list: Original grocery list
        budget_mode: If True, swap ALL possible items for cheaper alternatives

    Returns:
        Optimized grocery list with swaps made
    """
    optimized_list = []
    swaps_made = []
    total_savings = 0

    for ingredient in grocery_list:
        alternatives = find_cheaper_alternatives(ingredient, max_price_ratio=0.8 if budget_mode else 0.6)

        if alternatives and (budget_mode or alternatives[0]["savings"] > 20):
            # Make the swap
            best_alt = alternatives[0]
            optimized_list.append(best_alt["alternative"])
            swaps_made.append({
                "original": ingredient,
                "replacement": best_alt["alternative"],
                "savings": best_alt["savings"],
                "savings_percent": best_alt["savings_percent"]
            })
            total_savings += best_alt["savings"]
        else:
            # Keep original
            optimized_list.append(ingredient)

    return {
        "original_list": grocery_list,
        "optimized_list": optimized_list,
        "swaps_made": swaps_made,
        "total_savings": total_savings,
        "budget_mode": budget_mode
    }


def get_price_alert_ingredients() -> List[Dict]:
    """
    Find ingredients with significant price increases (for daily monitoring)

    Returns:
        List of ingredients with price alerts
    """
    # In production, this would compare current prices vs historical prices
    # For now, simulate with some mock data

    alerts = []

    # Simulate price spikes
    price_spikes = {
        "avocado": {"normal_price": 120, "current_price": 150, "increase_percent": 25},
        "salmon": {"normal_price": 150, "current_price": 180, "increase_percent": 20},
    }

    for ingredient, spike_data in price_spikes.items():
        if ingredient in NUTRITIONAL_EQUIVALENTS:
            alternatives = find_cheaper_alternatives(ingredient, max_price_ratio=1.5)

            alerts.append({
                "ingredient": ingredient,
                "normal_price": spike_data["normal_price"],
                "current_price": spike_data["current_price"],
                "increase_percent": spike_data["increase_percent"],
                "status": "price_spike",
                "cheaper_alternatives": alternatives[:2] if alternatives else []
            })

    return alerts
