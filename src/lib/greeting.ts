export function getTimeBasedGreeting(firstName?: string): string {
  const hour = new Date().getHours();
  let greeting = 'Good Morning';

  if (hour >= 12 && hour < 17) {
    greeting = 'Good Afternoon';
  } else if (hour >= 17) {
    greeting = 'Good Evening';
  }

  if (firstName) {
    return `${greeting}, ${firstName} 👋`;
  }

  return greeting;
}
