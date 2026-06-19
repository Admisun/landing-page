"use server";

import { createClient } from '@/lib/supabase/server';

export async function submitAdmissionForm(formData) {
  try {
    const supabase = await createClient();
    
    const testScore = formData.get('testScore');
    const graduationScore = formData.get('graduationScore');
    const budget = formData.get('budget');
    const workExperience = formData.get('workExperience');
    const preferredCities = formData.get('preferredCities');

    const { data, error } = await supabase
      .from('admission_submissions')
      .insert([
        {
          test_score: testScore,
          graduation_score: graduationScore ? parseFloat(graduationScore) : null,
          budget: budget,
          work_experience: workExperience,
          preferred_cities: preferredCities
        }
      ]);

    if (error) {
      console.error('Supabase Insert Error:', error);
      return { success: false, error: 'Failed to save submission.' };
    }

    return { success: true };
  } catch (err) {
    console.error('Server Action Error:', err);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}
