// Keep previously shared room invitations working at the original root URL.
if(/^#[a-f0-9]{32}$/i.test(location.hash))location.replace('/play/'+location.hash);
