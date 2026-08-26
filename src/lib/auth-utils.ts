import { supabase } from './supabaseClient';

// ---------------------------------------------------------------------------
// Password hashing (SHA-256 + static salt, matches the DB-side RPCs which
// compare against this exact hash — see the `login_teacher` / `login_student`
// Postgres functions).
// ---------------------------------------------------------------------------
const SALT = 'TIS_SALT_2024';

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + SALT);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return (await hashPassword(password)) === hash;
}

// ---------------------------------------------------------------------------
// Custom session (teacher / student — stored client-side, guarded by
// CustomSessionGuard). Admin sessions are handled by Supabase Auth directly.
// ---------------------------------------------------------------------------
const SESSION_KEY = 'tis_session';
const SESSION_TIMESTAMP_KEY = 'tis_session_timestamp';
const SESSION_TIMEOUT_MINUTES = 30;

export type TeacherSession = {
  role: 'teacher' | 'accountant';
  id: string;
  full_name: string;
  email: string;
  must_change_password: boolean;
  session_token?: string;
};

export type StudentSession = {
  role: 'student';
  id: string;
  full_name: string;
  username: string;
  admission_number: string;
  class_id: string | null;
  tier: string;
  must_change_password: boolean;
  session_token?: string;
};

export type ParentSession = {
  role: 'parent';
  id: string;
  full_name: string;
  email: string;
  must_change_password: boolean;
  session_token?: string;
};

export type CustomSession = TeacherSession | StudentSession | ParentSession;

export function setCustomSession(session: CustomSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
}

export function getCustomSession(): CustomSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    const timestamp = localStorage.getItem(SESSION_TIMESTAMP_KEY);
    
    if (!raw || !timestamp) {
      return null;
    }

    // Check if session has expired
    const sessionTime = parseInt(timestamp, 10);
    const currentTime = Date.now();
    const elapsedMinutes = (currentTime - sessionTime) / (1000 * 60);

    if (elapsedMinutes > SESSION_TIMEOUT_MINUTES) {
      clearCustomSession();
      return null;
    }

    // Update timestamp on session access (activity)
    localStorage.setItem(SESSION_TIMESTAMP_KEY, currentTime.toString());
    
    return JSON.parse(raw) as CustomSession;
  } catch {
    return null;
  }
}

export function clearCustomSession(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_TIMESTAMP_KEY);
}

export function isSessionExpired(): boolean {
  const timestamp = localStorage.getItem(SESSION_TIMESTAMP_KEY);
  if (!timestamp) return true;

  const sessionTime = parseInt(timestamp, 10);
  const currentTime = Date.now();
  const elapsedMinutes = (currentTime - sessionTime) / (1000 * 60);

  return elapsedMinutes > SESSION_TIMEOUT_MINUTES;
}

// ---------------------------------------------------------------------------
// Login (goes through SECURITY DEFINER Postgres RPCs so the `teachers` /
// `students` tables — which hold password hashes — are never queried
// directly with the public anon key).
// ---------------------------------------------------------------------------
export async function loginTeacher(
  email: string,
  password: string,
): Promise<{ session?: TeacherSession; error?: string }> {
  const passwordHash = await hashPassword(password);
  const { data, error } = await supabase.rpc('login_teacher', {
    p_email: email,
    p_password_hash: passwordHash,
  });
  if (error) return { error: error.message };
  if (data?.error === 'not_found' || data?.error === 'invalid_password') {
    return { error: 'Invalid email or password.' };
  }
  if (data?.error === 'inactive') {
    return { error: 'This account has been temporarily deactivated. To reactivate it, please settle any outstanding school fees or contact the office of the School Secretary.' };
  }
  const session: TeacherSession = {
    role: data.role || 'teacher',
    id: data.id,
    full_name: data.full_name,
    email: data.email,
    must_change_password: data.must_change_password || false,
    session_token: data.session_token,
  };
  setCustomSession(session);
  return { session };
}

export async function loginStudent(
  username: string,
  password: string,
): Promise<{ session?: StudentSession; error?: string }> {
  const passwordHash = await hashPassword(password);
  const { data, error } = await supabase.rpc('login_student', {
    p_username: username,
    p_password_hash: passwordHash,
  });
  if (error) return { error: error.message };
  if (data?.error === 'not_found' || data?.error === 'invalid_password') {
    return { error: 'Invalid username or password.' };
  }
  if (data?.error === 'inactive') {
    return { error: 'This account has been temporarily deactivated. To reactivate it, please settle any outstanding school fees or contact the office of the School Secretary.' };
  }
  if (data?.error === 'pending_approval') {
    return { error: 'Your account is pending admin approval. Please wait for the school administration to review your signup request.' };
  }
  if (data?.error === 'rejected') {
    return { error: 'Your signup request was rejected by the school administration. Please contact the school office for more information.' };
  }
  const session: StudentSession = {
    role: 'student',
    id: data.id,
    full_name: data.full_name,
    username: data.username,
    admission_number: data.admission_number,
    class_id: data.class_id,
    tier: data.tier,
    must_change_password: data.must_change_password || false,
    session_token: data.session_token,
  };
  setCustomSession(session);
  return { session };
}

export async function loginParent(
  email: string,
  password: string,
): Promise<{ session?: ParentSession; error?: string }> {
  const passwordHash = await hashPassword(password);
  const { data, error } = await supabase.rpc('login_parent', {
    p_email: email,
    p_password_hash: passwordHash,
  });
  console.log('Parent login RPC response:', JSON.stringify(data, null, 2), error);
  if (error) return { error: error.message };
  
  if (data?.error === 'not_found' || data?.error === 'invalid_password') {
    return { error: 'Invalid email or password.' };
  }
  if (data?.error === 'inactive') {
    return { error: 'This account has been temporarily deactivated. To reactivate it, please settle any outstanding school fees or contact the office of the School Secretary.' };
  }
  const session: ParentSession = {
    role: 'parent',
    id: data.id,
    full_name: data.full_name,
    email: data.email,
    must_change_password: data.must_change_password || false,
    session_token: data.session_token,
  };
  setCustomSession(session);
  return { session };
}

// ---------------------------------------------------------------------------
// Change password (for teachers, students, parents)
// ---------------------------------------------------------------------------
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ success?: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('change_password', {
    p_user_id: userId,
    p_current_password: currentPassword,
    p_new_password: newPassword,
  });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };
  return { success: true };
}

// ---------------------------------------------------------------------------
// Admin password reset (sets default password and forces change)
// ---------------------------------------------------------------------------
export async function adminResetPassword(
  role: 'teacher' | 'student' | 'parent',
  userId: string,
  defaultPassword: string,
): Promise<{ success?: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('admin_reset_password', {
    p_role: role,
    p_user_id: userId,
    p_default_password: defaultPassword,
  });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };
  return { success: true };
}

// ---------------------------------------------------------------------------
// Password strength validation
// ---------------------------------------------------------------------------
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Custom password reset (teacher/student). No live email sender is wired up
// yet, so `requestPasswordReset` returns the token directly for now — once
// an email-sending edge function is deployed, have it email the token
// instead of returning it to the client.
// ---------------------------------------------------------------------------
export async function requestPasswordReset(
  role: 'teacher' | 'student' | 'parent',
  identifier: string,
): Promise<{ token?: string; error?: string }> {
  const { data, error } = await supabase.rpc('request_password_reset', {
    p_role: role,
    p_identifier: identifier,
  });
  if (error) return { error: error.message };
  if (data?.error) return { error: 'No matching account was found.' };
  return { token: data.token };
}

export async function resetPasswordWithToken(
  role: 'teacher' | 'student' | 'parent',
  token: string,
  newPassword: string,
): Promise<{ success?: boolean; error?: string }> {
  const passwordHash = await hashPassword(newPassword);
  const { data, error } = await supabase.rpc('reset_password_with_token', {
    p_role: role,
    p_token: token,
    p_new_password_hash: passwordHash,
  });
  if (error) return { error: error.message };
  if (data?.error) return { error: 'This reset link is invalid or has expired.' };
  return { success: true };
}

// ---------------------------------------------------------------------------
// Teacher-initiated student creation (Teacher Students page). Goes through a
// SECURITY DEFINER RPC because the teacher session only carries the anon key.
// ---------------------------------------------------------------------------
export async function createStudentByTeacher(payload: {
  full_name: string;
  username: string;
  password_hash: string;
  email?: string;
  phone_number?: string;
  gender?: string;
  admission_number: string;
  class_id: string;
  tier: string;
  date_of_birth?: string;
  parent_name?: string;
  parent_phone?: string;
  parent_email?: string;
}) {
  return supabase.rpc('create_student_by_teacher', { p: payload });
}

// ---------------------------------------------------------------------------
// Nigerian grading scale
// ---------------------------------------------------------------------------
export type GradeLetter =
  | 'A1'
  | 'B2'
  | 'B3'
  | 'C4'
  | 'C5'
  | 'C6'
  | 'D7'
  | 'E8'
  | 'F9';

export function getGradeLetter(score: number): GradeLetter {
  if (score >= 75) return 'A1';
  if (score >= 70) return 'B2';
  if (score >= 65) return 'B3';
  if (score >= 60) return 'C4';
  if (score >= 55) return 'C5';
  if (score >= 50) return 'C6';
  if (score >= 45) return 'D7';
  if (score >= 40) return 'E8';
  return 'F9';
}

const GRADE_REMARKS: Record<GradeLetter, string> = {
  A1: 'Excellent',
  B2: 'Very Good',
  B3: 'Good',
  C4: 'Credit',
  C5: 'Credit',
  C6: 'Credit',
  D7: 'Pass',
  E8: 'Pass',
  F9: 'Fail',
};

export function getGradeRemark(letter: GradeLetter | string): string {
  return GRADE_REMARKS[letter as GradeLetter] ?? '';
}

export type SchoolTier = 'Primary' | 'Junior Secondary' | 'Senior Secondary';

export type MaxScores = {
  test_1: number;
  test_2: number;
  project_1: number;
  assignment_1: number;
  exam: number;
};

export function getMaxScores(tier: SchoolTier | string): MaxScores {
  if (tier === 'Senior Secondary') {
    return { test_1: 10, test_2: 10, project_1: 5, assignment_1: 5, exam: 70 };
  }
  return { test_1: 20, test_2: 20, project_1: 10, assignment_1: 10, exam: 40 };
}

export type ScoreFields = {
  test_1?: number | null;
  test_2?: number | null;
  project_1?: number | null;
  assignment_1?: number | null;
  exam?: number | null;
};

export function computeTotal(scores: ScoreFields): number {
  const {
    test_1 = 0,
    test_2 = 0,
    project_1 = 0,
    assignment_1 = 0,
    exam = 0,
  } = scores;
  return (test_1 || 0) + (test_2 || 0) + (project_1 || 0) + (assignment_1 || 0) + (exam || 0);
}

const ADMISSION_PREFIX_MAP: Record<string, string> = {
  Primary: 'PRI',
  'Junior Secondary': 'JSS',
  'Senior Secondary': 'SSS',
};

export function generateAdmissionNumber(
  tier: SchoolTier | string,
  existingNumbers: string[],
): string {
  const prefix = ADMISSION_PREFIX_MAP[tier] || 'STU';
  const numbers = existingNumbers
    .filter((n) => n.startsWith(prefix))
    .map((n) => parseInt(n.replace(prefix, ''), 10))
    .filter((n) => !isNaN(n));
  const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1001;
  return `${prefix}${next}`;
}
