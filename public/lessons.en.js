import { lessons as german } from './lessons.js';
const translations = [
  {name:'Getting in',sub:'The flush door handle',steps:[
    {title:'Press first.\nThen pull.',text:'The handle sits flush with the door. Press its wide end with your thumb. The narrow part pivots out so you can pull it.',note:'Keep fingers and jewellery clear of the mechanism.'},
    {title:'Inside,\nuse the button.',text:'The normal release is on top of the interior handle. Press the button while pushing the door open. The mechanical lever is for a loss of power.'},
    {title:'How does\nthe handle work?',text:'Remember the order. It feels unfamiliar the first time.',quiz:{question:'How do you open the door from outside?',options:['Yank the flush handle','Press the wide end, then pull','Tap the window twice'],answer:1,success:'Exactly. Pressing with your thumb pivots the handle out.',retry:'The flush handle needs to pivot out first.'}}
  ]},
  {name:'Driving',sub:'Cockpit & gear selection',steps:[
    {title:'One cockpit.\nOne screen.',text:'While parked, check your seat, mirrors and surroundings. Pressing the brake in Park brings up the drive mode strip on the touchscreen.'},
    {title:'Up for D.\nDown for R.',text:'Swipe up on the drive mode strip to drive forward. Swipe down to reverse. To park, press the brake and touch Park. Always check the displayed mode before moving.',note:'This is a stationary learning exercise. Never accept a drive mode without checking it.'},
    {title:'Choose your\ndirection deliberately.',text:'The overhead console provides a second gear selector when the touchscreen is unavailable.',quiz:{question:'Which touchscreen gesture selects Reverse?',options:['Swipe up','Swipe down','Hold both scroll wheels'],answer:1,success:'Correct. Swipe down to select R. Then check your surroundings and the display.',retry:'D is up. Reverse uses the opposite direction.'}}
  ]},
  {name:'Charging',sub:'Port & status lights',steps:[
    {title:'Rear left.\nBehind the flap.',text:'The charge port is at the left tail light. Open it using the touchscreen, app, or button on a compatible charge cable.',note:'Never force the charge port door open.'},
    {title:'The port\nspeaks in colours.',text:'Pulsing green: charging. Steady green: complete. Red: a fault has stopped charging. The touchscreen message explains the issue.'},
    {title:'Red means:\ncheck the display.',text:'The connector locks when fully inserted. The battery may first need heating or cooling before charging can begin.',quiz:{question:'The charge port light turns red. What should you do?',options:['Force the connector further in','Read the touchscreen message','Red means charging is complete'],answer:1,success:'Correct. Check the vehicle message. Red is not the finished signal.',retry:'Red indicates a charging problem. Steady green means complete.'}}
  ]},
  {name:'Frunk',sub:'Close it correctly',steps:[
    {title:'Open the front.\nWhile in Park.',text:'Release the front trunk using the touchscreen or app, then lift the hood. First check that the area is clear.'},
    {title:'Two hands.\nThe right places.',text:'Lower the hood until the striker touches the latches. Place both hands on the green areas shown in the manual and press down firmly.',note:'Do not drop it. Do not push on the centre or front edge.'},
    {title:'Before driving:\ncheck the latch.',text:'Gently try to lift the hood to confirm it is fully latched.',quiz:{question:'How should you close the hood?',options:['Let it drop from halfway up','Push the centre with one hand','Use both hands on the marked areas'],answer:2,success:'Exactly. Two hands, then check that it is securely latched.',retry:'The lightweight hood will not reliably latch under its own weight.'}}
  ]},
  {name:'Lighting',sub:'The Juniper signature',steps:[
    {title:'The new\nlight signature.',text:'A full-width front light bar with separate headlights below it. A wide, indirectly reflected rear light band. These are distinctive Juniper details.'},
    {title:'Automatic lights.\nYour responsibility.',text:'Exterior lighting returns to Auto each time you start driving. In poor visibility, check that both headlights and tail lights are on.',note:'Daytime running lights alone do not mean that the tail lights are on.'},
    {title:'Be seen\nfrom behind, too.',text:'Find the settings under Controls → Lights.',quiz:{question:'Are daytime running lights always enough in poor visibility?',options:['Yes, they switch on every light','No. Check headlights and tail lights'],answer:1,success:'Correct. Daytime running lights alone do not guarantee illuminated tail lights.',retry:'Check both ends of the car: front and rear.'}}
  ]},
  {name:'No power',sub:'Know the manual release',steps:[
    {title:'At the front:\nlift the lever.',text:'Without low-voltage power, the electric door button does not work. The manual release is in front of the window switches.',note:'Use only when necessary. Never while driving; the window may not lower automatically.'},
    {title:'At the rear:\nin the door pocket.',text:'Remove the cover at the bottom of the door pocket. Pull the mechanical release cable forwards. Show passengers where it is before they need it.'},
    {title:'Know it.\nKeep it for emergencies.',text:'The mechanical release is your way out during a power loss. Use the electric button in everyday use.',quiz:{question:'Where is the rear manual release?',options:['Under the cover in the door pocket','In the rear touchscreen','Under the head restraint'],answer:0,success:'Correct. Under the cover at the bottom of the rear door pocket.',retry:'The mechanical release is hidden in the door pocket.'}}
  ]},
  {name:'Regeneration',sub:'Recovering energy',steps:[
    {title:'From driving\nto recovering.',text:'While moving, releasing the accelerator can return energy to the battery. Switch between driving, lifting off and braking in the 3D view.'},
    {title:'Cold or full:\nless recovery.',text:'The battery may accept less energy. The current manual says regular brakes supplement deceleration when the accelerator is released.',note:'Anticipate stops and apply the brake pedal whenever needed. This illustration does not calculate stopping distance.'},
    {title:'Understand\nthe energy flow.',text:'Green on the power meter indicates recovery. At a standstill there is no motion energy to recover.',quiz:{question:'What can limit regenerative braking?',options:['A cold or fully charged battery','An open navigation menu','White seats'],answer:0,success:'Correct. The battery’s ability to accept energy limits recovery.',retry:'Consider whether the battery can accept more energy.'}}
  ]}
];
export const englishLessons = german.map((lesson,i)=>({
  ...lesson,...translations[i],steps:lesson.steps.map((step,j)=>({...step,...translations[i].steps[j]}))
}));
