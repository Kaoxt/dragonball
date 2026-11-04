// Small D1-compatible interface over the community Durable Object's SQLite storage.
export function database(storage){
 const sql=storage.sql;
 function prepare(query,args=[]){
  const execute=()=>{
   const results=sql.exec(query,...args).toArray();
   const meta=sql.exec('SELECT changes() AS changes,last_insert_rowid() AS last_row_id').toArray()[0];
   return {results,meta,success:true};
  };
  return {bind:(...values)=>prepare(query,values),run:execute,all:execute,first:column=>{const row=sql.exec(query,...args).toArray()[0]||null;return column?row?.[column]??null:row;}};
 }
 return {prepare,batch:items=>storage.transactionSync(()=>items.map(item=>item.run())),transaction:fn=>storage.transactionSync(fn)};
}
