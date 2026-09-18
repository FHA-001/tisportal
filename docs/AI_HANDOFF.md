# TIS PORTAL AI HANDOFF

## PROJECT
TIS Portal - School Management System
Repository: C:\Users\sulei\tisportal
Stack: React + TypeScript + Vite + Supabase + Tailwind CSS

## GLOBAL RULES
1. This is an existing project - do NOT redesign/rebuild working features unnecessarily
2. Inspect existing code before modifying anything
3. Do NOT apply Supabase SQL automatically - user manually runs all SQL after review
4. Do NOT loosen RLS/security/authentication rules to make features work
5. For security-sensitive/database problems: diagnose, explain, propose minimal fix, STOP, wait for approval
6. Do NOT commit or push unless explicitly instructed
7. Preserve working functionality
8. Do NOT repeat already completed database/security work unless newly discovered problem requires it
9. Never expose passwords, session tokens, service-role keys, or private credentials
10. Report whether session token EXISTS, but NEVER print its value

## CURRENT PHASE
PHASE 2E — B6A GRADES SECURITY

## COMPLETED
B6A-1: Student and Parent Grade reads secured via RPC (COMPLETE)
- Student Grade reads moved to secure RPC
- Parent child Grade reads moved to secure RPC  
- Parent authorization validated server-side through parent_students
- Student/Parent direct .from('grades') usage = 0
- Existing Student/Parent Grade UI works

B6A-2: Teacher grade reads/writes secured via RPC (MIGRATION APPLIED, BUG FOUND)
- Migration: supabase/migrations/20240827_secure_teacher_grade_access.sql
- Migration manually applied successfully
- Structural verification checks all passed
- Teacher direct .from('grades') usage = 0
- UI REGRESSION: Teacher Grading page fails (grades blank, page unresponsive)

## DATABASE STATE
Applied migrations:
- 20240826_custom_sessions_phase2a.sql
- 20240826_secure_teacher_student_read.sql  
- 20240827_secure_teacher_grade_access.sql (MANUALLY APPLIED - HAS BUG)

Live database facts:
- Teacher ID: 6ecf16ff-e9ec-42ea-b3e3-9c7eee3999b2 (Umar Ishaq)
- Active session: 2025/2026
- Confirmed assignments for Teacher:
  * Primary 5 / Social Studies (class_subject_id: 8678d173-3c56-4a0e-904b-84f4ed6586a6)
  * SSS 1 / Biology (class_subject_id: 78d2e8cd-e05b-40a5-bc6b-2a2c376ee24e)
- Existing grade data confirmed in database:
  * Primary 5 / Social Studies: 2 grade rows (First Term, 2025/2026)
  * SSS 1 / Biology: 8 grade rows (First Term, 2025/2026)
- All relationships verified correct (teacher assignments, student class membership, etc.)

## CURRENT BUG / BLOCKER
BLOCKER #1: B6A-2 Teacher Grading UI Regression (FIXES IMPLEMENTED, AWAITING SQL APPLICATION)

Symptoms:
1. Teacher grades appear blank/not displayed
2. Teacher cannot enter/edit grades
3. Grading page becomes extremely slow/unresponsive
4. Navigation becomes difficult/non-responsive on Grading page
5. Buttons become slow or non-responsive

BLOCKER #2: NEW - Admin/Report Card Duplicate Subject/Student Issue (DIAGNOSIS COMPLETE)

Symptoms:
1. Admin Grades page shows duplicate Student rows
2. Downloaded report card shows Biology twice
3. First Biology row has the correct grade
4. Second Biology row is blank/dashes

Known SSS 1 class_id: 81457762-8adf-4594-9a5d-9ebb130fc73c
Known active Biology assignment: 78d2e8cd-e05b-40a5-bc6b-2a2c376ee24e

Root causes identified and FIXED:
1. **SQL BUG in get_teacher_grades RPC**: Ambiguous column references
   - Error: `column reference "id" is ambiguous` (PostgreSQL error 42702)
   - Multiple locations had unqualified column references that could conflict with PL/pgSQL variables
   - FIXED: All table columns now qualified with table aliases (cs, s, g)

2. **Render loop in grading.tsx**: useEffect with unstable dependencies
   - Effect depended on `[students, grades]` array references
   - React Query returns new array references on every render
   - Effect called `setLocalGrades` on every run → infinite loop
   - FIXED: Implemented stable signatures using useMemo to detect actual data changes

3. **Frontend synchronization logic**: Array reference instability
   - Source: useTeacherGrades .map() transformation creates new array references
   - Source: React Query returns new array references during refetches
   - FIXED: Implemented deterministic signatures for students (IDs) and grades (all score fields)

What has been ruled out:
- Missing grade data (grades exist in database)
- Grade deletion (data intact)
- Teacher assignment ownership mismatch (verified correct)
- Students belonging to wrong class (verified correct)
- class_subjects.teacher_id mismatch (verified correct)
- Session authentication (session token exists, ID matches expected teacher)

## FILES CURRENTLY MODIFIED
Git status:
- modified: src/pages/teacher/grading.tsx (stable signature synchronization implemented)
- modified: supabase/migrations/20240827_secure_teacher_grade_access.sql (all ambiguous column references qualified)
- untracked: docs/ (AI_HANDOFF.md created)

Frontend fixes applied:
1. grading.tsx: Added useMemo to create stable studentSignature (based on student IDs)
2. grading.tsx: Added useMemo to create stable gradeSignature (based on all grade score fields)
3. grading.tsx: Changed useEffect dependencies to `[selectedAssignmentId, selectedTerm, activeSession?.name, studentSignature, gradeSignature]`
4. grading.tsx: Added useMemo import

SQL fixes applied:
1. get_teacher_grades: Lines 65-71 qualified with table alias cs
2. save_teacher_grades: Lines 215-223 qualified with table alias cs
3. save_teacher_grades: Lines 232-240 qualified with table alias s
4. save_teacher_grades: Lines 258-264 qualified with table alias g
5. save_teacher_grades: Lines 273-279 qualified with table alias cs
6. save_teacher_grades: Lines 317-331 qualified with table alias g

## TEST RESULTS
Frontend: Build successful (22.39s, 3373 modules transformed), no compilation errors
SQL: Not yet tested (migration needs to be manually applied by user)

## CURRENT TASK
MANUALLY APPLY THE CORRECTED SQL MIGRATION AND TEST UI REGRESSION FIX

The user must:
1. Review the fully corrected migration: supabase/migrations/20240827_secure_teacher_grade_access.sql
2. Manually run the corrected migration in Supabase SQL Editor
3. Verify the RPC no longer returns ambiguous column errors
4. Test the Teacher Grading page to confirm:
   - Grades display correctly
   - Inputs are editable
   - Page is responsive
   - No render loop occurs
   - Unsaved edits are not overwritten
   - Assignment/term changes resynchronize correctly

## DO NOT DO
- Do NOT commit/push the frontend changes until after SQL fix is verified
- Do NOT apply SQL automatically
- Do NOT loosen any security rules
- Do NOT revert B6A-1 work
- Do NOT modify the migration file beyond the SQL bug fix

## NEXT AFTER CURRENT TASK
After SQL fix is manually applied and verified:

1. Test Teacher Grading page with corrected SQL
2. Verify grades display correctly for both confirmed assignments
3. Verify grade inputs are editable
4. Verify page is responsive with no render loop
5. If all tests pass, commit frontend fixes with appropriate message
6. Update AI_HANDOFF.md to reflect successful B6A-2 completion

## LAST UPDATED
B6A-2 regression fixes fully implemented and ready for testing:
- SQL ambiguities fully resolved in both get_teacher_grades and save_teacher_grades RPCs
- All 6 locations with ambiguous column references qualified with table aliases
- Frontend render loop fixed using stable signatures approach
- useMemo creates deterministic signatures from actual data content
- Effect depends on signatures, not array references, preventing infinite loop
- Effect detects actual data changes (grade value changes) not just reference changes
- Build successful with no compilation errors
- Current status: READY FOR USER SQL APPLICATION AND UI REGRESSION TESTING
- NO SQL applied yet
- NO commit/push yet

## MINIMAL PROPOSED FIX
1. SQL: Apply corrected migration (single line change on line 69)
2. Frontend: Already fixed (useEffect dependency change to prevent render loop)
3. Files requiring modification: supabase/migrations/20240827_secure_teacher_grade_access.sql (already corrected, pending manual application)

## DATABASE CHANGES REQUIRED
Yes - the corrected migration must be manually applied by the user in Supabase SQL Editor.

## CONFIRMATION
- NO SQL applied yet (awaiting manual user review and application)
- NO commit/push yet (awaiting SQL fix verification)

## BLOCKER #2 DIAGNOSIS - DUPLICATE SUBJECT/STUDENT ISSUE

### KEY FINDING: CRITICAL SCHEMA DISCREPANCY

**DISCREPANCY IDENTIFIED:**
The `grades` table schema in `000_base_schema.sql` (line 77-88) shows:
- Original design: `assessment_type TEXT NOT NULL, score DECIMAL(5, 2) NOT NULL, max_score DECIMAL(5, 2) DEFAULT 100, remarks TEXT`
- Current RPCs expect: `test_1, test_2, project_1, assignment_1, exam, total, grade_letter, remark` columns

**CRITICAL MISMATCH:**
- Base schema defines a single-score assessment system (assessment_type + score)
- Application expects a multi-component grading system (test_1, test_2, project_1, assignment_1, exam, total, grade_letter)
- This indicates the database schema was modified in production but not reflected in migration files

### DATABASE INTEGRITY CHECKS COMPLETED

**class_subjects Table:**
- ✅ UNIQUE constraint exists: `UNIQUE(class_id, subject_id)` (line 55 in 000_base_schema.sql)
- ✅ This should prevent duplicate (class_id, subject_id) combinations
- ✅ Only ONE class_subject row should exist per class+subject combination

**Students Table:**
- ✅ Proper UNIQUE constraints: `email TEXT UNIQUE, username TEXT UNIQUE, admission_number TEXT UNIQUE`
- ✅ Primary key: `id UUID DEFAULT gen_random_uuid() PRIMARY KEY`
- ✅ Duplicate student records should not be possible due to these constraints

**Foreign Key References:**
- ✅ Only table referencing class_subjects: `grades.class_subject_id` (line 80 in 000_base_schema.sql)
- ✅ ON DELETE CASCADE: if class_subject deleted, dependent grades auto-delete
- ✅ No other tables reference class_subjects directly

### DUPLICATION SOURCE ANALYSIS

**Admin Grades Page (src/pages/admin/grades.tsx):**
- Line 32-36: Uses `useGrades` hook with `class_subject_id` filter
- Line 52-62: Report card generation queries ALL grades for student with class_subjects join
- Line 82-92: PDF generation maps each grade row to a subject row
- **Logic**: Each grade row becomes one subject row in report card

**Report Card Data Logic (src/lib/reportCardData.ts):**
- Line 36-41: Queries grades with class_subjects inner join on class_id
- Line 48-57: Maps grades by class_subject_id (not by subject_id)
- **Logic**: Per-subject rankings are computed per class_subject_id, not per logical subject

**Records Hook (src/hooks/use-records.ts):**
- Line 29-38: useGrades queries grades with students and class_subjects joins
- Line 79-101: Student/Parent RPCs join grades with class_subjects and subjects
- **Logic**: All grade queries include class_subjects relationship

### ROOT CAUSE HYPOTHESIS

**Most Likely Cause:**
Given the schema discrepancy, the most probable cause is:
1. The production database has the correct multi-component grading columns (test_1, test_2, etc.)
2. The base schema migration file was never updated to reflect this change
3. If there are duplicate class_subject rows for the same (class_id, subject_id), the UNIQUE constraint would have prevented this
4. **However**, if the constraint was temporarily disabled or bypassed, duplicates could exist
5. Each duplicate class_subject would have its own set of grade records
6. Admin grades and report cards would show one row per class_subject_id (not deduplicated by subject)

**Alternative Cause:**
1. Single class_subject row exists (UNIQUE constraint working)
2. Multiple grade rows exist for the same student + class_subject + term + session
3. This would also cause duplicate subject rows in report cards
4. This suggests a missing UNIQUE constraint on grades(student_id, class_subject_id, term, session)

### DATABASE INVESTIGATION REQUIRED

**To confirm the exact cause, the following SQL queries need to be run:**

```sql
-- Check for duplicate class_subjects for SSS 1 Biology
SELECT cs.id, cs.class_id, cs.subject_id, cs.teacher_id, t.full_name as teacher_name, s.name as subject_name
FROM class_subjects cs
JOIN teachers t ON cs.teacher_id = t.id
JOIN subjects s ON cs.subject_id = s.id
WHERE cs.class_id = '81457762-8adf-4594-9a5d-9ebb130fc73c'
  AND s.name = 'Biology';

-- Check for duplicate grade records for the same student+class_subject+term+session
SELECT g.id, g.student_id, g.class_subject_id, g.term, g.session, 
       st.full_name as student_name, s.name as subject_name
FROM grades g
JOIN students st ON g.student_id = st.id
JOIN class_subjects cs ON g.class_subject_id = cs.id
JOIN subjects s ON cs.subject_id = s.id
WHERE cs.class_id = '81457762-8adf-4594-9a5d-9ebb130fc73c'
  AND s.name = 'Biology'
  AND g.term = 'First Term'
  AND g.session = '2025/2026'
ORDER BY g.student_id, g.class_subject_id;

-- Check if the grades table has the expected columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'grades' 
ORDER BY ordinal_position;
```

### SAFEST FIX APPROACH

**If duplicate class_subjects exist:**
1. Identify which class_subject_id has actual grade records
2. Identify which has no grades (blank row source)
3. Delete the empty class_subject (cascade will delete any dependent grades)
4. The UNIQUE constraint will prevent future duplicates

**If duplicate grade records exist:**
1. Add UNIQUE constraint on grades(student_id, class_subject_id, term, session)
2. This will prevent future duplicate grade entries
3. For existing duplicates, manual cleanup needed (keep most recent or merge)

**Schema Update Required:**
1. Update `000_base_schema.sql` to reflect actual production schema
2. Document the schema evolution that occurred
3. Consider creating a migration to formalize the current state

### FILES NEEDING MODIFICATION
1. `supabase/migrations/000_base_schema.sql` - Update grades table definition to match production
2. Potential new migration to add missing UNIQUE constraint on grades table
3. `docs/AI_HANDOFF.md` - Update with resolution once diagnosed

### STATUS
- DIAGNOSIS COMPLETE
- ROOT CAUSE CONFIRMED: Duplicate grade records created during B6A-2 RPC failure
- NO SQL APPLIED
- NO FIXES IMPLEMENTED YET
- WAITING FOR USER APPROVAL FOR CORRECTIVE MIGRATION

## BLOCKER #2 RESOLUTION PLAN - DUPLICATE GRADE ROWS

### CONFIRMED ROOT CAUSE
During the B6A-2 Teacher grade access RPC failure period:
- Teacher grades failed to load due to SQL ambiguity error
- Frontend lost existing grade IDs (returned blank arrays)
- save_teacher_grades() received grade objects with no id
- Function executed INSERT instead of UPDATE for existing grades
- Created duplicate blank grade rows alongside existing populated rows

### CURRENT GRADE TABLE INTEGRITY STATE
**Existing Constraints/Indexes:**
- PRIMARY KEY on id only
- NO UNIQUE constraint on logical grade identity (student_id, class_subject_id, term, session)
- NO partial unique index covering logical identity
- NO other uniqueness protection

**This is a data integrity gap that allowed duplicates to be created.**

### PROPOSED DATA INTEGRITY RULE

**Recommended Unique Constraint:**
```sql
-- Using NULLS NOT DISTINCT to properly handle nullable session column
ALTER TABLE grades 
ADD CONSTRAINT grades_logical_identity_unique 
UNIQUE (student_id, class_subject_id, term, session) 
NULLS NOT DISTINCT;
```

**Alternative if NULLS NOT DISTINCT not supported:**
```sql
-- Create partial unique index for non-NULL sessions
CREATE UNIQUE INDEX grades_logical_identity_idx 
ON grades (student_id, class_subject_id, term, session) 
WHERE session IS NOT NULL;

-- Additional constraint for NULL sessions if needed
CREATE UNIQUE INDEX grades_logical_identity_null_session_idx 
ON grades (student_id, class_subject_id, term) 
WHERE session IS NULL;
```

**NULL Session Handling:**
- NULLS NOT DISTINCT treats NULL values as equal for uniqueness
- Prevents multiple rows with same (student_id, class_subject_id, term) when session IS NULL
- If NULLS NOT DISTINCT not available, use partial indexes as fallback

### PROPOSED save_teacher_grades HARDENING

**Current Logic (Vulnerable):**
```sql
IF v_grade_id IS NOT NULL THEN
  UPDATE existing grade
ELSE
  INSERT new grade  -- Vulnerable to duplicates if ID lost
```

**Proposed Logic (Duplicate-Proof):**
```sql
IF v_grade_id IS NOT NULL THEN
  -- Validate and update existing grade
  UPDATE public.grades AS g
  SET ... WHERE g.id = v_grade_id;
ELSE
  -- Check for existing grade with same logical identity
  SELECT g.id INTO v_existing_grade_id
  FROM public.grades AS g
  WHERE g.student_id = v_student_id
    AND g.class_subject_id = v_class_subject_id
    AND g.term = v_term
    AND (g.session = v_session_name OR (g.session IS NULL AND v_session_name IS NULL))
  LIMIT 1;
  
  IF v_existing_grade_id IS NOT NULL THEN
    -- Update existing grade instead of creating duplicate
    UPDATE public.grades AS g
    SET ...
    WHERE g.id = v_existing_grade_id;
  ELSE
    -- Insert new grade only if none exists
    INSERT INTO public.grades (...) VALUES (...);
  END IF;
END IF;
```

**Authorization Rules:**
- All existing B6A-2 authorization rules remain unchanged
- Teacher ownership validation still applies
- Student class membership validation still applies
- All validation happens before writes where possible

### SAFE CLEANUP FOR CONFIRMED DUPLICATES

**Defensive Cleanup SQL:**
```sql
-- Delete only the 3 confirmed blank duplicate rows
-- Each deletion is defensive and verifies the row is still blank

DELETE FROM grades 
WHERE id = '809b3449-94ce-4b58-963b-5538c1b0fbb8'
  AND test_1 IS NULL 
  AND test_2 IS NULL 
  AND project_1 IS NULL 
  AND assignment_1 IS NULL 
  AND exam IS NULL 
  AND total IS NULL 
  AND grade_letter IS NULL 
  AND remark IS NULL;

DELETE FROM grades 
WHERE id = 'da5e0164-8e71-4f74-b234-eb2e4a034638'
  AND test_1 IS NULL 
  AND test_2 IS NULL 
  AND project_1 IS NULL 
  AND assignment_1 IS NULL 
  AND exam IS NULL 
  AND total IS NULL 
  AND grade_letter IS NULL 
  AND remark IS NULL;

DELETE FROM grades 
WHERE id = 'c4b47b9e-02d6-4d23-bca1-4ed8423a2a4a'
  AND test_1 IS NULL 
  AND test_2 IS NULL 
  AND project_1 IS NULL 
  AND assignment_1 IS NULL 
  AND exam IS NULL 
  AND total IS NULL 
  AND grade_letter IS NULL 
  AND remark IS NULL;
```

**Safety Features:**
- Each DELETE includes WHERE clause verifying all score fields are NULL
- Will not delete rows if they were subsequently populated
- Will not delete the populated real grade rows
- Targeted only to the 3 confirmed duplicate IDs

### GLOBAL DUPLICATE DETECTION QUERY

**Read-Only Duplicate Finder:**
```sql
-- Find ALL duplicate logical grades across entire database
SELECT 
  g.student_id,
  s.full_name as student_name,
  g.class_subject_id,
  cs.class_id,
  c.name as class_name,
  cs.subject_id,
  sub.name as subject_name,
  g.term,
  g.session,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(g.id ORDER BY g.created_at) as grade_ids,
  ARRAY_AGG(
    CASE 
      WHEN g.test_1 IS NULL AND g.test_2 IS NULL AND 
           g.project_1 IS NULL AND g.assignment_1 IS NULL AND 
           g.exam IS NULL AND g.total IS NULL AND g.grade_letter IS NULL 
      THEN 'blank' 
      ELSE 'populated' 
    END ORDER BY g.created_at
  ) as row_status
FROM grades g
JOIN students s ON g.student_id = s.id
JOIN class_subjects cs ON g.class_subject_id = cs.id
JOIN classes c ON cs.class_id = c.id
JOIN subjects sub ON cs.subject_id = sub.id
GROUP BY 
  g.student_id, s.full_name, 
  g.class_subject_id, cs.class_id, c.name, 
  cs.subject_id, sub.name, 
  g.term, g.session
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, c.name, sub.name, s.full_name;
```

**This query will:**
- Identify ALL duplicate sets across the entire database
- Show student, class, subject, term, session for each duplicate set
- Report count of duplicates
- List all grade IDs in the duplicate set
- Indicate which rows are blank vs populated
- Help determine if Biology is the only affected subject

### PROPOSED NEW CORRECTIVE MIGRATION

**Filename:** `20240811_fix_grade_duplicates_and_integrity.sql`

**Migration Contents:**
1. Safe cleanup of 3 confirmed blank duplicate rows
2. Add logical uniqueness constraint to grades table
3. Update save_teacher_grades RPC to prevent future duplicates
4. Global duplicate detection query (commented, for manual verification)

**Migration Strategy:**
- New migration rather than editing existing historical migration
- Explicit and auditable integrity fix
- Follows project naming convention (YYYYMMDD_description.sql)
- Can be applied incrementally with verification between steps

### FRONTEND CODE ANALYSIS

**Admin Grades Page (src/pages/admin/grades.tsx):**
- Line 82-92: Maps each grade row to one subject row in PDF
- No deduplication logic - correctly displays data as returned from database
- No frontend changes required - database integrity fix is the correct solution

**Report Card Data Logic (src/lib/reportCardData.ts):**
- Line 36-41: Queries grades with class_subjects join
- Line 48-57: Maps grades by class_subject_id
- No deduplication logic - correctly processes data as returned from database
- No frontend changes required - database integrity fix is the correct solution

**Conclusion:** Frontend code is working correctly. The issue is database integrity, not frontend logic. No frontend changes required.

### COMPLETE REPORT

1. **Existing grade uniqueness constraints/indexes:**
   - PRIMARY KEY on id only
   - NO UNIQUE constraint on logical grade identity (student_id, class_subject_id, term, session)
   - NO partial unique index covering logical identity
   - This is a data integrity gap that allowed duplicates to be created

2. **Exact proposed unique rule:**
   ```sql
   ALTER TABLE grades 
   ADD CONSTRAINT grades_logical_identity_unique 
   UNIQUE (student_id, class_subject_id, term, session) 
   NULLS NOT DISTINCT;
   ```
   Alternative using partial indexes if NULLS NOT DISTINCT not supported

3. **How NULL session is handled:**
   - NULLS NOT DISTINCT treats NULL values as equal for uniqueness
   - Prevents multiple rows with same (student_id, class_subject_id, term) when session IS NULL
   - Alternative: Partial unique indexes for NULL and non-NULL sessions separately

4. **Exact proposed save_teacher_grades duplicate-prevention behavior:**
   - If v_grade_id provided: Validate and update existing grade
   - If v_grade_id NULL: Check for existing grade with same logical identity
   - If existing grade found: Update existing grade instead of INSERT
   - If no existing grade: INSERT new grade
   - All B6A-2 authorization rules remain unchanged

5. **Complete defensive cleanup SQL for 3 known blank duplicates:**
   ```sql
   DELETE FROM grades 
   WHERE id = '809b3449-94ce-4b58-963b-5538c1b0fbb8'
     AND test_1 IS NULL AND test_2 IS NULL AND project_1 IS NULL 
     AND assignment_1 IS NULL AND exam IS NULL AND total IS NULL 
     AND grade_letter IS NULL AND remark IS NULL;

   DELETE FROM grades 
   WHERE id = 'da5e0164-8e71-4f74-b234-eb2e4a034638'
     AND test_1 IS NULL AND test_2 IS NULL AND project_1 IS NULL 
     AND assignment_1 IS NULL AND exam IS NULL AND total IS NULL 
     AND grade_letter IS NULL AND remark IS NULL;

   DELETE FROM grades 
   WHERE id = 'c4b47b9e-02d6-4d23-bca1-4ed8423a2a4a'
     AND test_1 IS NULL AND test_2 IS NULL AND project_1 IS NULL 
     AND assignment_1 IS NULL AND exam IS NULL AND total IS NULL 
     AND grade_letter IS NULL AND remark IS NULL;
   ```

6. **Complete read-only global duplicate detection SQL:**
   ```sql
   SELECT 
     g.student_id, s.full_name as student_name,
     g.class_subject_id, cs.class_id, c.name as class_name,
     cs.subject_id, sub.name as subject_name,
     g.term, g.session,
     COUNT(*) as duplicate_count,
     ARRAY_AGG(g.id ORDER BY g.created_at) as grade_ids,
     ARRAY_AGG(
       CASE WHEN g.test_1 IS NULL AND g.test_2 IS NULL AND 
            g.project_1 IS NULL AND g.assignment_1 IS NULL AND 
            g.exam IS NULL AND g.total IS NULL AND g.grade_letter IS NULL 
       THEN 'blank' ELSE 'populated' END ORDER BY g.created_at
     ) as row_status
   FROM grades g
   JOIN students s ON g.student_id = s.id
   JOIN class_subjects cs ON g.class_subject_id = cs.id
   JOIN classes c ON cs.class_id = c.id
   JOIN subjects sub ON cs.subject_id = sub.id
   GROUP BY g.student_id, s.full_name, g.class_subject_id, cs.class_id, 
            c.name, cs.subject_id, sub.name, g.term, g.session
   HAVING COUNT(*) > 1
   ORDER BY duplicate_count DESC, c.name, sub.name, s.full_name;
   ```

7. **Proposed new migration filename:**
   - `20240811_fix_grade_duplicates_and_integrity.sql`

8. **Whether any frontend changes are actually required:**
   - NO - Frontend code is working correctly
   - Database integrity fix is the correct solution
   - No deduplication logic needed in frontend

9. **Git status:**
   ```
   modified:   src/pages/teacher/grading.tsx
   modified:   supabase/migrations/20240827_secure_teacher_grade_access.sql
   untracked:  docs/
   ```

10. **Confirmation NO SQL applied:**
    - NO SQL applied - only analysis and design completed
    - Cleanup SQL prepared but not executed
    - Migration designed but not created
    - RPC hardening designed but not implemented

11. **Confirmation NO commit/push:**
    - NO commit/push - awaiting user approval for corrective migration
    - Existing B6A-2 fixes remain uncommitted pending SQL verification

## BLOCKER #2 RESOLUTION - DUPLICATE GRADE ROWS IMPLEMENTED

### MIGRATION FILE CREATED
**Filename:** `supabase/migrations/20240828_fix_grade_duplicates_and_integrity.sql`

**Contents Review:**
1. ✅ Safe cleanup of 3 confirmed blank duplicate rows with defensive verification
2. ✅ Post-cleanup duplicate assertion (DO block) - ensures no duplicates remain before constraint
3. ✅ Add logical uniqueness constraint: UNIQUE NULLS NOT DISTINCT (student_id, class_subject_id, term, session)
4. ✅ Harden save_teacher_grades with UPSERT logic to prevent future duplicates
5. ✅ Preserve all B6A-2 authorization/security validation
6. ✅ All table references qualified (no SQL ambiguity)
7. ✅ SECURITY DEFINER preserved
8. ✅ Empty search_path preserved
9. ✅ Correct privileges: anon execute allowed, authenticated/PUBLIC blocked
10. ✅ ON CONFLICT target matches unique constraint exactly
11. ✅ Unused variable v_conflict_grade_id removed

### VERIFICATION FILE CREATED
**Filename:** `supabase/migrations/verify_grade_integrity_fix.sql`

**Verification Coverage:**
1. ✅ No duplicate logical grade identities remain
2. ✅ grades_logical_identity_unique constraint exists
3. ✅ save_teacher_grades function exists
4. ✅ SECURITY DEFINER configured
5. ✅ Empty search_path configured
6. ✅ Anon execute permission allowed
7. ✅ Authenticated execute blocked
8. ✅ Public execute blocked
9. ✅ Teacher session validation present
10. ✅ Assignment ownership validation present
11. ✅ Student class validation present
12. ✅ Logical duplicate prevention (ON CONFLICT) present
13. ✅ B6A-2 ambiguous column fix preserved

### BUILD VERIFICATION
- ✅ Build successful (29.90s, 3373 modules transformed)
- ✅ No compilation errors
- ⚠️ Typecheck command not available (tsc not recognized)

### CURRENT GIT STATUS
```
modified:   src/pages/teacher/grading.tsx
modified:   supabase/migrations/20240827_secure_teacher_grade_access.sql
untracked:  docs/
untracked:  supabase/migrations/20240828_fix_grade_duplicates_and_integrity.sql
untracked:  supabase/migrations/verify_grade_integrity_fix.sql
```

### CURRENT TASK
**Await user manual rerun of structurally corrected verification SQL in Supabase SQL Editor.**

The 20240828 migration was manually applied successfully.
The first verification file failed with SQL error (aggregate/GROUP BY violation).
The second verification draft was found structurally unsafe before execution:
- CTE scope violation (CTEs referenced across multiple SQL statements)
- Constraint column aggregation with external ORDER BY causing GROUP BY risk
- Complicated function signature matching using unnest(proargtypes)
- Incorrect search_path verification (treating NULL proconfig as success)
- PUBLIC permission check using invalid has_function_privilege('public', ...)
- Missing NULLS NOT DISTINCT verification

The verification file has been completely rewritten to fix all structural problems:
- Single SQL statement with all CTEs consolidated
- Exact function signature matching using PostgreSQL regprocedure
- Correct search_path verification using pg_proc.proconfig array inspection
- PUBLIC permission check using ACL catalog (aclexplode with grantee OID 0)
- NULLS NOT DISTINCT verification using pg_index.indnullsnotdistinct
- Added immutable identity validation check
- 18 comprehensive checks with consolidated output format
- Summary check that confirms all 18 checks pass

**NO SQL has been applied to the live database.**
**NO commit/push performed.**

## BLOCKER #2 RESOLUTION - VERIFICATION SQL FINAL CORRECTIONS

### FOUR FINAL CORRECTIONS APPLIED

The verification file `verify_grade_integrity_fix.sql` required four final corrections to fix SQL/catalog errors:

**1. USE regprocedure, NOT regproc - ✅ FIXED**
- All function signature lookups now use `::regprocedure::oid` for exact signature resolution
- Changed 10 locations from `::regproc::oid` to `::regprocedure::oid`
- Lines 157, 182, 210, 284, 321, 348, 375, 403, 431, 458, 487, 513 all use ::regprocedure
- No ::regproc remains in the file

**2. FIX EMPTY search_path VERIFICATION - ✅ CORRECT (was already correct)**
- Lines 207-217 correctly inspect pg_proc.proconfig array
- Accepts PostgreSQL's explicit empty representation: `search_path=""` or `search_path=`
- COALESCE with FALSE means NULL proconfig fails (correct behavior)
- Does NOT treat NULL proconfig as success

**3. FIX PUBLIC EXECUTE VERIFICATION - ✅ CORRECT (was already correct)**
- Lines 278-287 use aclexplode with COALESCE(p.proacl, acldefault('f', p.proowner))
- Line 285 correctly checks grantee = 0 (OID 0 represents PUBLIC)
- Does NOT use has_function_privilege('public', ...) which is invalid
- Correctly handles case when proacl IS NULL using PostgreSQL default ACL

**4. VERIFY NULLS NOT DISTINCT THROUGH CONSTRAINT INDEX - ✅ FIXED**
- Lines 108-118 now use pg_constraint.conindid to link constraint to its backing index
- Join pg_index ON i.indexrelid = c.conindid
- Verify c.conname = 'grades_logical_identity_unique'
- Verify i.indnullsnotdistinct = TRUE
- No longer identifies index only by name

### VERIFICATION FILE STRUCTURE

- ✅ Single SQL statement with all CTEs consolidated
- ✅ No CTE referenced outside the statement
- ✅ 18 comprehensive verification checks
- ✅ Consolidated output with ALL CHECKS PASS summary
- ✅ READ-ONLY - no INSERT, UPDATE, DELETE, ALTER, CREATE, DROP, GRANT, REVOKE

### CURRENT TASK

**Await user/ChatGPT review of the final corrected verify_grade_integrity_fix.sql, then manually run it in Supabase.**

The verification file is now complete and structurally correct with all four final corrections applied.

**NO SQL applied to live database.**
**NO commit/push performed.**

## B6A-3 GRADES TABLE LOCKDOWN AUDIT

### B6A-2 FULLY COMPLETE
- B6A-2 Teacher grade access security fully implemented
- Grade integrity migration (20240828) manually applied successfully
- All 18 structural verification checks passed
- Full Teacher/Student/Parent/Admin grade regression passed
- Corrective commit/push completed
- Working tree clean

### ATTENDANCE FEATURE SKIPPED
Attendance feature has been removed from the product.
No dedicated Attendance security phase will be implemented.

### B6A-3 CURRENT TASK: AUDIT BEFORE LOCKDOWN

**DO NOT modify SQL yet. DO NOT apply SQL. DO NOT commit/push.**

User manually applies all Supabase SQL after ChatGPT review.

### STEP 1: REPO AUDIT COMPLETE

**Migration files touching grades:**
1. `000_base_schema.sql` - Base grades table creation
2. `20240720_security_rls.sql` - Original comprehensive RLS policies (Admin full access, Teacher/Student/Parent role-based access)
3. `20240720_security_rls_simple.sql` - Simplified RLS (authenticated users only)
4. `20240827_secure_student_parent_grade_reads.sql` - B6A-1: Secure RPCs for Student/Parent grade reads
5. `20240827_secure_teacher_grade_access.sql` - B6A-2: Secure RPCs for Teacher grade operations
6. `20240828_fix_grade_duplicates_and_integrity.sql` - Grade integrity fix with unique constraint
7. `verify_grade_integrity_fix.sql` - READ-ONLY verification (already applied successfully)

**Application code direct grades access:**

**Admin direct SELECT (STILL REQUIRED):**
- `src/hooks/use-records.ts` line 29: `useGrades()` hook - direct SELECT for Admin
- `src/pages/admin/grades.tsx` line 53: Direct SELECT for report card PDF generation
- `src/lib/reportCardData.ts` line 37: Direct SELECT for class rankings computation

**Teacher direct access (RPC-ONLY - COMPLETE):**
- `src/hooks/use-records.ts` line 173: `useTeacherGrades()` uses `get_teacher_grades` RPC ✅
- `src/hooks/use-records.ts` line 220: `useSaveTeacherGrades()` uses `save_teacher_grades` RPC ✅
- `src/pages/teacher/grading.tsx` line 39: Uses `useTeacherGrades()` RPC ✅
- NO direct Teacher INSERT/UPDATE/DELETE on grades table ✅

**Student direct access (RPC-ONLY - COMPLETE):**
- `src/hooks/use-records.ts` line 64: `useStudentGrades()` uses `get_student_grades` RPC ✅
- `src/pages/student/grades.tsx` line 24: Uses `useStudentGrades()` RPC ✅
- NO direct Student SELECT on grades table ✅

**Parent direct access (RPC-ONLY - COMPLETE):**
- `src/hooks/use-records.ts` line 118: `useParentChildGrades()` uses `get_parent_child_grades` RPC ✅
- `src/pages/parent/grades.tsx` line 28: Uses `useParentChildGrades()` RPC ✅
- NO direct Parent SELECT on grades table ✅

**Accountant direct access (NONE - CORRECT):**
- No Accountant grade access found in application code ✅
- Accountant role is finance-only, no grade operations ✅

### STEP 2: LIVE AUDIT SQL PREPARED

**READ-ONLY audit SQL created:** `supabase/migrations/audit_grades_lockdown.sql`

This SQL reports:
1. RLS enabled status on public.grades
2. All RLS policies on public.grades (policy name, command, roles, USING/WITH CHECK expressions)
3. Table grants on public.grades for PUBLIC, anon, authenticated, service_role
4. Column grants if any
5. Table ownership
6. Views/functions that depend on or expose grades
7. RPC functions that access grades (with security definer/invoker status)
8. RPC function execute grants

**User must run this audit SQL manually in Supabase SQL Editor.**

### STEP 3: PROPOSED B6A-3 LOCKDOWN PLAN (PENDING AUDIT RESULTS)

**Target security model (based on repo audit):**

**RLS Enabled.**

**Admin:**
- Keep direct SELECT for Admin UI (useGrades hook, report card generation, rankings)
- Add one trusted-Admin SELECT policy using `SELECT public.is_admin()`
- Remove permissive legacy Admin policies if they exist
- NO direct Admin INSERT/UPDATE/DELETE (not used in application)

**Teacher:**
- Already RPC-only (B6A-2 complete)
- Revoke all direct table access
- RLS should block any direct table access attempts
- Continue through SECURITY DEFINER RPCs only

**Student:**
- Already RPC-only (B6A-1 complete)
- Revoke all direct table access
- RLS should block any direct table access attempts
- Continue through SECURITY DEFINER RPC only

**Parent:**
- Already RPC-only (B6A-1 complete)
- Revoke all direct table access
- RLS should block any direct table access attempts
- Continue through SECURITY DEFINER RPC only

**Generic anon/authenticated:**
- Must not be able to bypass RPC model
- Revoke all direct table access

**service_role/postgres:**
- Retain required privileged backend access

### STEP 4: RPC DEPENDENCY CHECK (FROM MIGRATION FILES)

**These RPCs are SECURITY DEFINER and therefore do not depend on caller table privileges:**

1. `public.get_student_grades(TEXT, TEXT, TEXT)` - SECURITY DEFINER, empty search_path, anon execute, authenticated blocked ✅
2. `public.get_parent_child_grades(TEXT, UUID, TEXT, TEXT)` - SECURITY DEFINER, empty search_path, anon execute, authenticated blocked ✅
3. `public.get_teacher_grades(TEXT, UUID, TEXT, TEXT)` - SECURITY DEFINER, empty search_path, anon execute, authenticated blocked ✅
4. `public.save_teacher_grades(TEXT, JSONB)` - SECURITY DEFINER, empty search_path, anon execute, authenticated blocked ✅

**These RPCs will continue to work if direct grades table grants are removed.**

### CURRENT BLOCKER

Awaiting user to run `audit_grades_lockdown.sql` in Supabase SQL Editor and return results.

The audit will reveal:
- Current live RLS policies (may differ from migration files)
- Current live table grants (may differ from migration files)
- Any unexpected dependencies or exposures
- Exact current state before lockdown migration

### NEXT AFTER AUDIT

Once user returns live audit results:
1. Compare live state vs migration file expectations
2. Adjust proposed lockdown plan based on actual live state
3. Create minimal B6A-3 lockdown migration
4. Prepare verification SQL
5. User manually applies migration
6. Run verification to confirm lockdown
7. Test all role UIs for regressions

### CONFIRMATION

- NO SQL applied yet
- NO migration created yet
- NO commit/push performed
- Only audit SQL prepared for manual execution
- Awaiting live Supabase audit results

## HOMEWORK SECURITY AUDIT

### B6A-3 GRADES LOCKDOWN COMPLETE
- B6A-3 grades table lockdown migration created
- 19/19 structural verification checks passed
- Full grade UI regression passed
- Grades table locked down to Admin SELECT only
- Teacher/Student/Parent use RPC-only model
- Attendance dedicated phase SKIPPED (feature removed)

### HOMEWORK SECURITY CURRENT TASK: AUDIT BEFORE IMPLEMENTATION

**DO NOT apply SQL. DO NOT create or modify live database objects. DO NOT commit/push.**

User manually runs all Supabase SQL after ChatGPT review.

### STEP 1: REPOSITORY AUDIT COMPLETE

**Homework table schema (from 20240716_homework.sql):**
- Table name: `public.homework`
- Columns:
  - `id` UUID PRIMARY KEY
  - `title` TEXT NOT NULL
  - `description` TEXT NOT NULL
  - `class_id` UUID NOT NULL (FK to classes)
  - `subject_id` UUID NOT NULL (FK to subjects)
  - `teacher_id` UUID NOT NULL (FK to teachers)
  - `published_at` TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  - `due_date` DATE NOT NULL
  - `attachment_url` TEXT
  - `created_at` TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  - `updated_at` TIMESTAMP WITH TIME ZONE DEFAULT NOW()

**Original RLS policies (from 20240716_homework.sql):**
- "Teachers can insert their homework" - INSERT with `teacher_id = auth.uid()`
- "Teachers can update their homework" - UPDATE with `teacher_id = auth.uid()`
- "Teachers can delete their homework" - DELETE with `teacher_id = auth.uid()`
- "Teachers can view their homework" - SELECT with `teacher_id = auth.uid()`
- "Students can view their class homework" - SELECT with `class_id IN (SELECT class_id FROM students WHERE id = auth.uid())`
- "Admins can view all homework" - SELECT with `true`
- "Admins can insert homework" - INSERT with `true`
- "Admins can update homework" - UPDATE with `true`
- "Admins can delete homework" - DELETE with `true`

**Application code direct homework access:**

**Teacher direct access (CURRENTLY INSECURE):**
- `src/hooks/use-homework.ts` line 10: `useHomework()` - direct SELECT with `teacher_id` filter ❌
- `src/hooks/use-homework.ts` line 75: `useCreateHomework()` - direct INSERT ❌
- `src/hooks/use-homework.ts` line 96: `useUpdateHomework()` - direct UPDATE ❌
- `src/hooks/use-homework.ts` line 118: `useDeleteHomework()` - direct DELETE ❌
- `src/pages/teacher/homework.tsx` line 29: Uses direct table access ❌
- **SECURITY ISSUE:** Teacher relies on client-supplied `teacher_id` from session

**Student direct access (CURRENTLY INSECURE):**
- `src/hooks/use-homework.ts` line 31: Uses `get_student_class` RPC to get class_id ❌
- `src/hooks/use-homework.ts` line 45: direct SELECT with `class_id` filter ❌
- `src/pages/student/homework.tsx` line 12: Uses direct table access ❌
- **SECURITY ISSUE:** Student relies on `get_student_class` which accepts client-supplied student_id

**Parent homework access (NONE - CORRECT):**
- No Parent homework access found in application code ✅
- No Parent homework UI exists ✅

**Admin homework access (NONE - CORRECT):**
- No Admin homework access found in application code ✅
- No Admin homework UI exists ✅
- Original policies allowed Admin full access but not used

**Accountant homework access (NONE - CORRECT):**
- No Accountant homework access found in application code ✅
- Accountant role is finance-only, no homework operations ✅

### STEP 2: get_student_class AUDIT

**Function definition (from 20240720_student_class_rpc.sql):**
- Signature: `get_student_class(p_student_id UUID)`
- Returns: `TABLE (class_id UUID)`
- SECURITY DEFINER ✅
- **SECURITY ISSUE:** Accepts `p_student_id` from caller ❌
- **SECURITY ISSUE:** Caller can request any student's class ❌
- **SECURITY ISSUE:** No session validation ❌
- **SECURITY ISSUE:** No authorization check ❌

**Current usage:**
- `src/hooks/use-homework.ts` line 31: Called with `studentId` from session
- Used by Student homework to get class_id for filtering

**Assessment:** **UNSAFE - NEEDS REPLACEMENT**

The function is SECURITY DEFINER but accepts any student_id from the caller, allowing a Student to potentially request another student's class information. It should be replaced with a session-validated RPC similar to the grade RPCs.

### STEP 3: LIVE AUDIT SQL PREPARED

**READ-ONLY audit SQL created:** `supabase/migrations/audit_homework_security.sql`

This SQL reports:
1. Homework table exact schema
2. RLS enabled status and FORCE RLS status
3. All RLS policies on homework (policy name, command, roles, USING/WITH CHECK expressions)
4. Table grants for anon, authenticated, service_role
5. Column grants if any
6. Table ownership
7. Dependent views/materialized views
8. Public functions referencing homework table
9. Function signatures, SECURITY DEFINER/INVOKER, search_path
10. EXECUTE privileges for anon, authenticated, service_role
11. Exact metadata/security for get_student_class function
12. get_student_class execute grants

**User must run this audit SQL manually in Supabase SQL Editor.**

### STEP 4: PROPOSED SECURITY MODEL (PENDING AUDIT RESULTS)

**Target security model (based on repo audit):**

**Teacher:**
- Create SECURITY DEFINER RPC for Teacher homework CRUD
- Authorization derived server-side from Teacher custom session
- Assignment/class ownership validated server-side
- Use `validate_custom_session('teacher')` pattern from B6A-2
- Remove direct table access
- RPC functions:
  - `get_teacher_homework(p_session_token, filters)`
  - `create_teacher_homework(p_session_token, homework_data)`
  - `update_teacher_homework(p_session_token, homework_id, homework_data)`
  - `delete_teacher_homework(p_session_token, homework_id)`

**Student:**
- Replace `get_student_class` with session-validated RPC
- Create SECURITY DEFINER RPC for Student homework read
- Class/student identity derived server-side from Student custom session
- Use `validate_custom_session('student')` pattern from B6A-1
- Remove direct table access
- RPC function:
  - `get_student_homework(p_session_token, filters)`

**Parent:**
- No Parent homework access required (not implemented)

**Admin:**
- No Admin homework access required (not implemented)
- Remove permissive Admin policies
- If needed in future, add trusted-Admin SELECT policy using `SELECT public.is_admin()`

**RLS:**
- Enable FORCE RLS to prevent any direct table access bypass
- Remove all existing permissive policies
- Add minimal policies only if direct table access is absolutely required
- Prefer RPC-only model for security

### STEP 5: LIKELY MIGRATIONS/RPCs NEEDED

**New migrations likely needed:**
1. `20240830_secure_homework_access.sql` - Create secure RPCs for Teacher/Student homework
2. `20240830_replace_get_student_class.sql` - Replace unsafe get_student_class with session-validated version
3. `20240830_lockdown_homework_table.sql` - Enable FORCE RLS, remove permissive policies

**New RPC functions likely needed:**
1. `get_teacher_homework(p_session_token TEXT, p_class_id UUID, p_subject_id UUID)` - Teacher homework read
2. `create_teacher_homework(p_session_token TEXT, p_homework JSONB)` - Teacher homework create
3. `update_teacher_homework(p_session_token TEXT, p_homework_id UUID, p_homework JSONB)` - Teacher homework update
4. `delete_teacher_homework(p_session_token TEXT, p_homework_id UUID)` - Teacher homework delete
5. `get_student_homework(p_session_token TEXT, p_term TEXT)` - Student homework read
6. Replace `get_student_class` with session-validated version or eliminate it entirely

### STEP 6: LIKELY UI REGRESSIONS TO TEST

After implementing secure RPCs:
- Teacher homework page still loads correctly
- Teacher can create homework for assigned classes/subjects
- Teacher can update/delete their own homework
- Student homework page still loads correctly
- Student sees only homework for their own class
- No ability to bypass authorization through direct table access
- No ability to request other students' class information

### CURRENT BLOCKER

Awaiting user to run `audit_homework_security.sql` in Supabase SQL Editor and return results.

The audit will reveal:
- Current live RLS policies (may differ from migration files)
- Current live table grants (may differ from migration files)
- Current state of get_student_class function
- Any unexpected dependencies or exposures
- Exact current state before security implementation

### NEXT AFTER AUDIT

Once user returns live audit results:
1. Compare live state vs migration file expectations
2. Confirm get_student_class is indeed unsafe
3. Design final secure RPC architecture
4. Create minimal security migration
5. Prepare verification SQL
6. User manually applies migration
7. Run verification to confirm security
8. Test Teacher/Student homework UIs for regressions

### HOMEWORK SECURITY COMPLETE
- Homework secure RPC migration created (20240830_secure_homework_access.sql)
- Homework related data fix migration created (20240831_fix_homework_related_data.sql)
- Homework verification migration created (verify_homework_security.sql)
- 21/21 verification checks passed
- Teacher/Student Homework functional regression passed
- Corrective commit/push completed
- Working tree clean

### REMAINING TABLES SECURITY AUDIT
All remaining tables need security audit today.

### TARGET TABLES FOR AUDIT
- school_account_details
- parents
- teachers
- teachers_directory
- pending_student_signups
- academic_sessions
- school_fees
- payment_accounts
- announcements
- audit_logs
- subjects
- class_subjects
- newsletters
- notifications

### CURRENT TASK: CONSOLIDATED REMAINING TABLE SECURITY AUDIT

**DO NOT apply SQL. DO NOT create or modify live database objects. DO NOT commit/push.**

User manually runs all Supabase SQL after ChatGPT review.

### AUDIT STEPS COMPLETED

**STEP 1: REPO USAGE AUDIT COMPLETE**
- Direct table access searched for all target tables
- RPC/function usage identified
- Role-by-role usage mapped
- High-risk tables identified

**STEP 2: MIGRATION/POLICY HISTORY COMPLETE**
- RLS enablement history reviewed
- Existing/legacy policies identified
- Grants/revokes documented
- Unsafe patterns flagged

**STEP 3: HIGH-RISK REVIEW COMPLETE**
- school_account_details: Banking/payment information - HIGH RISK
- parents: Personal data exposure - HIGH RISK
- teachers: Sensitive fields - MEDIUM RISK
- pending_student_signups: Signup token/data - HIGH RISK
- audit_logs: Should be Admin-only - HIGH RISK
- payment accounts: Financial data - HIGH RISK

**STEP 4: READ-ONLY AUDIT SQL CREATED**
- `supabase/migrations/audit_remaining_security.sql` created
- Inspects all target tables
- Reports RLS status, policies, grants, dependencies
- READ-ONLY - no modifications

**STEP 5: SECURITY DEFINER FUNCTION AUDIT COMPLETE**
- `supabase/migrations/audit_security_definer_functions.sql` created
- Inspects all SECURITY DEFINER functions
- Identifies missing search_path, unsafe execute permissions
- Reports session validation, auth.uid() usage, caller-supplied IDs

**STEP 6: ATTENDANCE LEFTOVERS CHECK COMPLETE**
- attendance table exists (20240719_attendance.sql)
- attendance hooks exist (use-attendance.ts)
- attendance page exists (teacher/attendance.tsx)
- Feature is in codebase but should be removed as per plan

### TABLE EXISTENCE FINDINGS
- teachers_directory: MISSING (not a table)
- pending_student_signups: VIEW (not a table - defined in 20240721_student_signup.sql)
- audit_logs: MISSING (not found in migrations, but referenced in use-records.ts)
- notifications: MISSING (not found in migrations, but referenced in payment RPCs)

### DIRECT TABLE USAGE FINDINGS

**school_account_details:**
- src/hooks/use-parents.ts line 473: SELECT (Admin/Parent account details)
- src/hooks/use-parents.ts line 492: UPSERT (Admin/Parent account details)
- Used by Admin for payment account management
- Used by Parent for fee payment information

**parents:**
- src/hooks/use-parents.ts line 39: SELECT (Admin parent management)
- src/hooks/use-parents.ts line 180: INSERT (Admin parent creation)
- src/hooks/use-parents.ts line 207: UPDATE (Admin parent update)
- src/hooks/use-parents.ts line 228: DELETE (Admin parent deletion)
- Direct table access by Admin only
- Parent uses secure RPCs (get_parent_children, get_parent_fee_payments, etc.)

**teachers:**
- src/hooks/use-users.ts line 121: INSERT (Admin teacher creation)
- src/hooks/use-users.ts line 146: UPDATE (Admin teacher update)
- src/hooks/use-users.ts line 162: DELETE (Admin teacher deletion)
- Direct table access by Admin only
- Teacher flows use secure RPCs (login_teacher, get_students_by_teacher, etc.)

**academic_sessions:**
- src/hooks/use-finance.ts line 63: SELECT (Accountant finance dashboard)
- src/hooks/use-finance.ts line 212: SELECT (Accountant finance dashboard)
- src/hooks/use-academics.ts line 196: SELECT (Admin session management)
- src/hooks/use-academics.ts line 208: UPDATE (Admin session creation)
- src/hooks/use-academics.ts line 229: UPDATE (Admin session update)
- Direct table access by Admin and Accountant

**school_fees:**
- src/hooks/use-parents.ts line 354: SELECT (Parent fee lookup)
- src/hooks/use-parents.ts line 365: SELECT (Parent fee lookup fallback)
- src/hooks/use-school-fees.ts line 10: SELECT (Admin fee management)
- src/hooks/use-school-fees.ts line 24: UPDATE (Admin fee update)
- Direct table access by Admin and Parent

**payment_accounts:**
- src/hooks/use-school-fees.ts line 44: SELECT (Admin payment account management)
- src/hooks/use-school-fees.ts line 58: INSERT (Admin payment account creation)
- src/hooks/use-school-fees.ts line 88: UPDATE (Admin payment account update)
- src/hooks/use-school-fees.ts line 114: DELETE (Admin payment account deletion)
- Direct table access by Admin only

**announcements:**
- src/hooks/use-announcements.ts line 10: SELECT (Admin announcement management)
- src/hooks/use-announcements.ts line 29: SELECT (Public announcements)
- src/hooks/use-announcements.ts line 49: SELECT (Student announcements)
- src/hooks/use-announcements.ts line 66: SELECT (Parent announcements)
- src/hooks/use-announcements.ts line 83: SELECT (Teacher announcements)
- src/hooks/use-announcements.ts line 106: INSERT (Admin announcement creation)
- src/hooks/use-announcements.ts line 130: UPDATE (Admin announcement update)
- src/hooks/use-announcements.ts line 155: DELETE (Admin announcement deletion)
- Direct table access by all roles (filtered by RLS policies)

**audit_logs:**
- src/hooks/use-records.ts line 247: SELECT (Admin audit log viewing)
- src/hooks/use-records.ts line 257: INSERT (All roles - audit logging)
- Direct table access by all roles

**subjects:**
- src/hooks/use-academics.ts line 85: SELECT (Admin subject management)
- src/hooks/use-academics.ts line 96: INSERT (Admin subject creation)
- src/hooks/use-academics.ts line 112: UPDATE (Admin subject update)
- src/hooks/use-academics.ts line 128: DELETE (Admin subject deletion)
- Direct table access by Admin only

**class_subjects:**
- src/hooks/use-academics.ts line 144: SELECT (Admin/Teacher class assignment management)
- src/hooks/use-academics.ts line 164: INSERT (Admin class assignment creation)
- src/hooks/use-academics.ts line 180: DELETE (Admin class assignment deletion)
- Direct table access by Admin and Teacher

**newsletters:**
- src/hooks/use-newsletters.ts line 10: SELECT (Public newsletter viewing)
- src/hooks/use-newsletters.ts line 25: SELECT (Admin newsletter management)
- src/hooks/use-newsletters.ts line 56: INSERT (Admin newsletter creation)
- src/hooks/use-newsletters.ts line 83: UPDATE (Admin newsletter publish)
- src/hooks/use-newsletters.ts line 109: UPDATE (Admin newsletter unpublish)
- src/hooks/use-newsletters.ts line 155: DELETE (Admin newsletter deletion)
- Direct table access by Admin and Public

### PROPOSED BATCHED SECURITY FIX PLAN

**GROUP A: RPC-ONLY RECOMMENDED (HIGH PRIORITY)**
- school_account_details - Banking data, should be Admin-only RPC
- parents - Personal data, should be Admin-only RPC
- payment_accounts - Financial data, should be Admin-only RPC

**GROUP B: TRUSTED ADMIN DIRECT SELECT ONLY**
- teachers - Admin management table, already RLS-hardened
- subjects - Reference data, Admin-only appropriate
- class_subjects - Assignment management, requires careful Teacher access

**GROUP C: SAFE PUBLIC/MINIMAL READ**
- newsletters - Public PDFs, current read model appropriate
- announcements - Public announcements, current filtered read appropriate

**GROUP D: BACKEND/SERVICE-ONLY**
- audit_logs - Should be service_role only, no direct client access
- pending_student_signups - Admin view only, should be service_role backed

**GROUP E: REFERENCE DATA (LOW RISK)**
- academic_sessions - Reference data, current Admin access appropriate
- school_fees - Reference data, current Admin/Parent access appropriate

**GROUP F: ATTENDANCE CLEANUP**
- attendance table, hooks, and pages should be removed

### CONFIRMATION

- NO SQL applied yet
- NO lockdown migration created yet
- NO commit/push performed
- Only audit SQL files created for manual execution
- Awaiting user review and approval of batched security plan
