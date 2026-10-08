import {sampleCards} from '../practice-deck.js';
const details = {
 'krillin-heat-seeking-blast':['130','Energy Combat','Freestyle'],
 'goku-battle-ready':['127','Physical Combat','Freestyle'],
 'namek-dragon-ball-5':['136','Dragon Ball','Freestyle'],
 'goku-super-saiyan-3':['152','Main Personality','Freestyle'],
 'red-style-mastery':['144','Mastery','Red'],
 'majin-buu':['151','Main Personality','Freestyle'],
 'master-roshi-sensei':['153','Sensei','Freestyle'],
 'piccolo-sensei':['125','Sensei','Freestyle'],
 'eternal-dragons-quest':['150','Non-Combat','Freestyle'],
 'nail-combat-drill':['137','Non-Combat Drill','Freestyle'],
 'red-king-cold-observation':['143','Combat','Red'],
 'orange-energy-dan-drill':['138','Non-Combat Drill','Orange'],
 'orange-junction-energy-blast':['139','Energy Combat','Orange'],
 'super-android-17-ki-intensity':['OP34','Energy Combat','Freestyle'],
 'farewell-drill':['OP33','Non-Combat Drill','Freestyle'],
};
export const catalog=sampleCards.map(c=>({...c,number:details[c.id][0],type:details[c.id][1],style:details[c.id][2],set:'Arena collection',status:'Ready'}));
catalog.push({id:'saiyan-001-orange-standing-fist-punch',name:'Orange Standing Fist Punch',number:'1',type:'Physical Combat',style:'Orange',set:'Saiyan Saga',status:'Preview',image:'/assets/cards/saiyan-001-orange-standing-fist-punch.webp',source:'https://retrodbzccg.com/card-images/saiyan-saga-commons/1-orange-standing-fist-punch/'});
