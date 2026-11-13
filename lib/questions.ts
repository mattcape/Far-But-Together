// The Question of the day. Everyone sees the same question on the same day.

export const QUESTIONS = [
  "What is one small thing I do that always makes you smile?",
  "What is your favorite memory of the two of us so far?",
  "What is something you are looking forward to doing together?",
  "What song reminds you of us, and why?",
  "When did you first realize you liked me?",
  "What is one thing you want us to try this year?",
  "What does a perfect ordinary day together look like to you?",
  "What is something I taught you without meaning to?",
  "What is one thing you are proud of yourself for lately?",
  "What is your favorite thing about how we communicate?",
  "If we could teleport anywhere for one evening, where would we go?",
  "What is a tiny detail about me that you love?",
  "What is something that made you laugh this week?",
  "What is one thing I could do from far away that would make your day better?",
  "What is a meal you would love to cook or eat together?",
  "What was the best part of our last visit?",
  "What is a dream you have that you haven't told many people?",
  "What is one thing you are grateful for about us?",
  "What is a movie or show you want us to watch together?",
  "What is something you miss most when we are apart?",
  "What is your favorite way to be comforted?",
  "What is a habit of mine you find adorable?",
  "What is one goal we could work toward together?",
  "Describe our first date in three words.",
  "What is a place that feels like home to you, and why?",
  "What do you think we will be doing five years from now?",
  "What is something kind someone did for you recently?",
  "What is a small ritual you would like us to have?",
  "What is a skill you would love to learn together?",
  "What is one thing you admire about the way I handle hard days?",
  "What is your favorite photo of us, and what do you love about it?",
  "What is a question you have always wanted to ask me?",
  "What is a smell, sound or taste that makes you think of me?",
  "What is the nicest thing anyone has said about us?",
  "What is something you want to do on our next visit?",
  "What is one thing that helps you feel close to me from far away?",
  "What is a childhood memory you love sharing?",
  "What is one thing about your day I would never guess?",
  "What is your idea of a perfect surprise?",
  "What is something about the future that excites you?",
  "What do you think is our best quality as a couple?",
  "What is a risk you are glad we took?",
  "What is a holiday or tradition you would like us to start?",
  "What is the funniest thing that has happened to us?",
  "What is something you wish more people knew about me?",
  "What is a compliment you would like to hear more often?",
  "What is a place near you that you want to show me?",
  "What is one word that describes how you feel about us today?",
  "What is a lesson you learned from a past relationship that helps us now?",
  "What is a thing we do that nobody else would understand?",
  "What is something you are nervous or excited about right now?",
  "What is a gift you could give me that costs nothing?",
  "What is the best advice you have ever been given?",
  "What would you put in a time capsule for us?",
  "What is a moment when you felt really supported by me?",
  "What is something simple that makes you feel loved?",
  "What would you like to say to us a year from now?",
  "What are three things you love about our relationship?",
  "What is a song you want us to dance to someday?",
  "What is something you want to thank me for?",
  "What is one thing that surprised you about being close to me?",
];

// The day changes at midnight Pacific time, so both of you get the same
// question no matter where you are.
export function questionDay(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
  }).format(date);
}

export function questionFor(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const dayNumber = Math.floor(Date.UTC(y, m - 1, d) / 86400000);

  return QUESTIONS[dayNumber % QUESTIONS.length];
}
