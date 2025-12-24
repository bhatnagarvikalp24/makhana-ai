/**
 * Comprehensive health and medical validation utilities
 */

/**
 * Calculate BMI and classify it
 */
export const calculateBMI = (weight, height) => {
  const heightInMeters = height / 100;
  const bmi = weight / (heightInMeters * heightInMeters);

  let classification = '';
  if (bmi < 16) classification = 'Severely Underweight';
  else if (bmi < 18.5) classification = 'Underweight';
  else if (bmi < 25) classification = 'Normal';
  else if (bmi < 30) classification = 'Overweight';
  else if (bmi < 35) classification = 'Obese Class I';
  else if (bmi < 40) classification = 'Obese Class II';
  else classification = 'Obese Class III (Morbidly Obese)';

  return { bmi: bmi.toFixed(1), classification };
};

/**
 * Validate weight/height combination with goal
 */
export const validateWeightGoalCombination = (weight, height, goal, age) => {
  const { bmi, classification } = calculateBMI(weight, height);
  const bmiValue = parseFloat(bmi);

  // Extreme BMI cases
  if (bmiValue >= 40) {
    if (goal === 'Weight Gain' || goal === 'Muscle Gain') {
      return {
        valid: false,
        message: `Your BMI is ${bmi} (${classification}). At this weight, gaining more weight could be dangerous. Please consult a healthcare professional and consider weight loss instead.`,
        suggestion: 'Weight Loss'
      };
    }
  }

  if (bmiValue >= 35 && bmiValue < 40) {
    if (goal === 'Weight Gain') {
      return {
        valid: false,
        message: `Your BMI is ${bmi} (${classification}). Weight gain is not recommended. Consider weight loss or consult a doctor for personalized advice.`,
        suggestion: 'Weight Loss'
      };
    }
  }

  // Severely underweight cases
  if (bmiValue < 16) {
    if (goal === 'Weight Loss') {
      return {
        valid: false,
        message: `Your BMI is ${bmi} (${classification}). You are severely underweight. Weight loss could be life-threatening. Please consult a healthcare professional immediately.`,
        suggestion: 'Weight Gain'
      };
    }
  }

  // Underweight cases
  if (bmiValue < 18.5) {
    if (goal === 'Weight Loss') {
      return {
        valid: false,
        message: `Your BMI is ${bmi} (${classification}). You are underweight. Weight loss is not recommended. Consider healthy weight gain instead.`,
        suggestion: 'Weight Gain'
      };
    }
  }

  // Age-based warnings for extreme goals
  if (age >= 65) {
    if (goal === 'Muscle Gain' && bmiValue < 20) {
      return {
        valid: true,
        warning: `At age ${age} with BMI ${bmi}, muscle gain is possible but should be done gradually with medical supervision.`
      };
    }
    if (goal === 'Weight Loss' && bmiValue < 22) {
      return {
        valid: true,
        warning: `At age ${age}, maintaining a slightly higher BMI (22-25) is often healthier. Extreme weight loss is not recommended.`
      };
    }
  }

  return { valid: true };
};

/**
 * Gender-specific medical condition validation
 */
export const MALE_SPECIFIC_CONDITIONS = [
  'uterus', 'uterine', 'ovarian', 'ovary', 'menstrual', 'period', 'menopause',
  'endometriosis', 'pcos', 'pcod', 'pregnancy', 'pregnant', 'breast feeding',
  'breastfeeding', 'lactation', 'cervical', 'cervix', 'vaginal'
];

export const FEMALE_SPECIFIC_CONDITIONS = [
  'prostate', 'testicular', 'testosterone deficiency', 'erectile'
];

export const validateMedicalConditionsForGender = (gender, medicalText) => {
  if (!medicalText || medicalText.trim() === '') return { valid: true };

  const lowerText = medicalText.toLowerCase();

  if (gender === 'Male') {
    const invalidConditions = MALE_SPECIFIC_CONDITIONS.filter(condition =>
      lowerText.includes(condition)
    );

    if (invalidConditions.length > 0) {
      return {
        valid: false,
        message: `"${medicalText}" appears to be a female-specific condition. Please verify your gender selection or medical information.`,
        invalidTerms: invalidConditions
      };
    }
  }

  if (gender === 'Female') {
    const invalidConditions = FEMALE_SPECIFIC_CONDITIONS.filter(condition =>
      lowerText.includes(condition)
    );

    if (invalidConditions.length > 0) {
      return {
        valid: false,
        message: `"${medicalText}" appears to be a male-specific condition. Please verify your gender selection or medical information.`,
        invalidTerms: invalidConditions
      };
    }
  }

  return { valid: true };
};

/**
 * Validate if child/teen has appropriate goals
 */
export const validateAgeAppropriateGoals = (age, goal) => {
  if (age < 18) {
    if (goal === 'Weight Loss' && age < 12) {
      return {
        valid: true,
        warning: `At age ${age}, growth is still happening. Weight loss should only be done under medical supervision. Consider "Balanced Diet" instead.`
      };
    }
    if (goal === 'Muscle Gain' && age < 16) {
      return {
        valid: true,
        warning: `At age ${age}, intense muscle building isn't recommended. Focus on healthy eating and age-appropriate physical activity.`
      };
    }
  }

  return { valid: true };
};

/**
 * Validate extreme calorie deficits/surplus
 */
export const validateCalorieTarget = (currentWeight, targetCalories, goal) => {
  // Minimum safe calories
  const minCalories = currentWeight < 50 ? 1200 : 1500;
  const maxCalories = currentWeight * 50; // Rough upper limit

  if (targetCalories < minCalories) {
    return {
      valid: false,
      message: `Target calories (${targetCalories}) are too low. Minimum safe intake is ${minCalories} calories/day.`
    };
  }

  if (targetCalories > maxCalories) {
    return {
      valid: false,
      message: `Target calories (${targetCalories}) seem unusually high. Please verify your activity level and goals.`
    };
  }

  return { valid: true };
};

/**
 * Comprehensive pre-submission validation
 */
export const validateFormData = (formData, medicalConditions) => {
  const validations = [];

  // 1. BMI and goal validation
  const weightGoalValidation = validateWeightGoalCombination(
    parseFloat(formData.weight),
    parseFloat(formData.height),
    formData.goal,
    parseInt(formData.age)
  );

  if (!weightGoalValidation.valid) {
    validations.push({
      type: 'error',
      field: 'goal',
      ...weightGoalValidation
    });
  } else if (weightGoalValidation.warning) {
    validations.push({
      type: 'warning',
      field: 'goal',
      ...weightGoalValidation
    });
  }

  // 2. Age-appropriate goals
  const ageGoalValidation = validateAgeAppropriateGoals(
    parseInt(formData.age),
    formData.goal
  );

  if (ageGoalValidation.warning) {
    validations.push({
      type: 'warning',
      field: 'age',
      ...ageGoalValidation
    });
  }

  // 3. Gender-specific medical conditions
  const medicalTextArray = formData.medical_manual || [];
  for (const medicalText of medicalTextArray) {
    const medicalValidation = validateMedicalConditionsForGender(
      formData.gender,
      medicalText
    );

    if (!medicalValidation.valid) {
      validations.push({
        type: 'error',
        field: 'medical',
        ...medicalValidation
      });
    }
  }

  return validations;
};
