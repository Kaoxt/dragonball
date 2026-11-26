// Synthetic mechanics and rectangular vector stand-ins, never shipped in the catalog.
export function gtFixture() {
 const component = (text, width=8, height=10) => ({text,bounds:[0,0,width,height],paths:[{d:`M0 0H${width}V${height}H0Z`,fill:'#ffffff'}]});
 const stages=[8400000,8000000,7600000,7200000,6800000,6400000];
 const power={rules:'Energy attack costing 1 stage. DAMAGE: 3 life cards.',attack:'energy',cost:1,damage:3};
 const high={id:'test-gt-goku-ht',name:'Goku',type:'Personality',rarity:'Hi-Tech',level:1,pur:0,set:'Test GT',number:'1',image:'/assets/cards/test-gt-goku-ht.webp?v=one',downloadImage:'/assets/cards/downloads/test-gt-goku-ht.webp?v=one',gtHiTech:{verified:true,revision:'1',character:'goku',stages:[null,7500000,null,0,null,null,5000000,4000000,0],inherit:{pur:true,power:true,stages:[0,2,4,5]},power:{rules:'Fixed power.'},render:{stageSlots:Array.from({length:9},(_,i)=>({x:830,y:150+i*65,width:180,height:35})),pur:{x:65,y:880,width:90,height:70},power:{x:230,y:1000,width:600,height:260}}}};
 const backer={id:'test-gt-backer',name:'Goku Test Backer',type:'Event',set:'Test GT',number:'2',image:'/assets/cards/test-gt-backer.webp',rules:power.rules,gtBacker:{verified:true,revision:'1',characters:['goku'],style:'Saiyan',pur:4,stages,power,native:{pur:component('4'),stages:stages.map(n=>component(n.toLocaleString('en-US'),110,25)),power:component(power.rules,580,90)}}};
 const regular={id:'test-regular',name:'Goku',type:'Personality',level:2,pur:2,image:'/assets/cards/test-regular.webp'};
 const life={id:'test-event',name:'Test Event',type:'Event',image:'/assets/cards/test-event.webp'};
 const catalog=[high,backer,regular,life];
 const deck={id:'gt-test',name:'GT Test',visibility:'public',tokui:'Saiyan',personalities:[high,regular,{...regular,level:3},null,null],mastery:null,sensei:null,backer:{id:backer.id},cards:[{...life,qty:47}],senseiDeck:[]};
 return {high,backer,regular,life,catalog,deck};
}
