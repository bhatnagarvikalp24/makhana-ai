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
 * Validate target weight realism and safety
 */
export const validateTargetWeight = (currentWeight, targetWeight, height, age, goal) => {
  const weightDiff = targetWeight - currentWeight;
  const currentBMI = calculateBMI(currentWeight, height);
  const targetBMI = calculateBMI(targetWeight, height);

  const currentBMIValue = parseFloat(currentBMI.bmi);
  const targetBMIValue = parseFloat(targetBMI.bmi);

  // 1. Check if target weight is same as current
  if (Math.abs(weightDiff) < 1) {
    return {
      valid: false,
      message: `Your target weight (${targetWeight}kg) is almost the same as your current weight (${currentWeight}kg). Please set a meaningful target or choose "Balanced Diet" goal.`
    };
  }

  // 2. Check goal consistency with target weight
  if (goal === 'Weight Loss' && weightDiff > 0) {
    return {
      valid: false,
      message: `You selected "Weight Loss" but your target weight (${targetWeight}kg) is higher than your current weight (${currentWeight}kg). Either change your goal to "Weight Gain" or adjust your target weight.`
    };
  }

  if ((goal === 'Weight Gain' || goal === 'Muscle Gain') && weightDiff < 0) {
    return {
      valid: false,
      message: `You selected "${goal}" but your target weight (${targetWeight}kg) is lower than your current weight (${currentWeight}kg). Either change your goal to "Weight Loss" or adjust your target weight.`
    };
  }

  // 3. Check if target BMI is unsafe (too low)
  if (targetBMIValue < 16) {
    return {
      valid: false,
      message: `Your target weight would result in a severely underweight BMI of ${targetBMI.bmi} (${targetBMI.classification}). This is medically unsafe. Please set a higher target weight (minimum BMI 18.5 recommended).`
    };
  }

  // 4. Check if target BMI is unsafe (too high)
  if (targetBMIValue >= 35 && weightDiff > 0) {
    return {
      valid: false,
      message: `Your target weight would result in BMI ${targetBMI.bmi} (${targetBMI.classification}). Gaining to this weight is not recommended for health reasons. Please set a lower target weight.`
    };
  }

  // 5. Check if weight change is too aggressive
  const maxSafeWeeklyLoss = age >= 65 ? 0.4 : age >= 60 ? 0.6 : 1.0; // kg/week
  const maxSafeWeeklyGain = age >= 65 ? 0.3 : age >= 60 ? 0.5 : 0.75; // kg/week

  const absoluteWeightChange = Math.abs(weightDiff);

  // Estimate minimum safe duration
  let minWeeks;
  if (weightDiff < 0) {
    // Weight loss
    minWeeks = Math.ceil(absoluteWeightChange / maxSafeWeeklyLoss);
  } else {
    // Weight gain
    minWeeks = Math.ceil(absoluteWeightChange / maxSafeWeeklyGain);
  }

  // If change requires more than 52 weeks (1 year), warn
  if (minWeeks > 52) {
    const months = Math.ceil(minWeeks / 4);
    return {
      valid: true,
      warning: `Your target weight requires a ${absoluteWeightChange}kg change, which will take approximately ${months} months to achieve safely. We'll design a sustainable long-term plan for you.`
    };
  }

  // 6. Age-specific warnings for aggressive targets
  if (age >= 65) {
    if (absoluteWeightChange > 10) {
      return {
        valid: true,
        warning: `At age ${age}, changing weight by ${absoluteWeightChange}kg requires careful planning. We'll design a gentle, sustainable approach that prioritizes your health and energy levels.`
      };
    }
  }

  return { valid: true };
};

/**
 * Comprehensive pre-submission validation
 */
export const validateFormData = (formData, medicalConditions) => {
  const validations = [];

  // 1. Target weight validation (PRIORITY CHECK)
  if (formData.target_weight) {
    const targetWeightValidation = validateTargetWeight(
      parseFloat(formData.weight),
      parseFloat(formData.target_weight),
      parseFloat(formData.height),
      parseInt(formData.age),
      formData.goal
    );

    if (!targetWeightValidation.valid) {
      validations.push({
        type: 'error',
        field: 'target_weight',
        ...targetWeightValidation
      });
    } else if (targetWeightValidation.warning) {
      validations.push({
        type: 'warning',
        field: 'target_weight',
        ...targetWeightValidation
      });
    }
  }

  // 2. BMI and goal validation
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
