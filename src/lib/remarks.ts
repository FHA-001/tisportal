// Automatic Remarks for Report Cards
// Provides deterministic Class Teacher and Principal remarks based on student average

/**
 * Get Class Teacher's automatic remark
 * Instructional and supportive tone
 * Aligned with existing grading bands (A1-F9)
 */
export function getClassTeacherRemark(average: number): string {
  if (average >= 90) {
    return "An outstanding performance. Maintain this excellent standard and continue striving for greater achievement.";
  }
  if (average >= 80) {
    return "A very good performance. Continue working diligently and aim for even greater achievement.";
  }
  if (average >= 75) {
    return "A strong performance. Keep up the good work and maintain your consistent effort.";
  }
  if (average >= 70) {
    return "A good performance with room for improvement. Greater consistency will produce better results.";
  }
  if (average >= 65) {
    return "A satisfactory performance. More focused study and consistent effort will lead to improvement.";
  }
  if (average >= 60) {
    return "A fair performance. Increased dedication and better preparation are needed for stronger results.";
  }
  if (average >= 50) {
    return "Your performance needs improvement. Regular study and active participation in class are essential.";
  }
  if (average >= 40) {
    return "More effort and consistent study are required. You are encouraged to improve your preparation and engagement.";
  }
  return "Significant improvement is needed. Greater commitment, discipline, and sustained academic effort are strongly encouraged.";
}

/**
 * Get Principal's automatic remark
 * Formal and institutional tone
 * Aligned with existing grading bands (A1-F9)
 */
export function getPrincipalRemark(average: number): string {
  if (average >= 90) {
    return "An exceptional result reflecting excellent academic commitment. Keep sustaining this remarkable standard.";
  }
  if (average >= 80) {
    return "A commendable result. Maintain your focus and continue building on this strong performance.";
  }
  if (average >= 75) {
    return "A solid academic performance. Your dedication is noted. Continue building on this foundation.";
  }
  if (average >= 70) {
    return "A satisfactory result. Improved focus and consistent study habits will strengthen your academic progress.";
  }
  if (average >= 65) {
    return "Your performance shows room for growth. Increased discipline and regular study are required for improvement.";
  }
  if (average >= 60) {
    return "This result requires attention. Greater commitment to your studies and academic responsibilities is expected.";
  }
  if (average >= 50) {
    return "Your academic performance needs significant improvement. Stronger study habits and greater discipline are necessary.";
  }
  if (average >= 40) {
    return "This performance requires improvement. Greater commitment, discipline and sustained academic effort are strongly encouraged.";
  }
  return "Your academic performance is unsatisfactory. Immediate improvement in study habits, discipline, and academic engagement is required.";
}
