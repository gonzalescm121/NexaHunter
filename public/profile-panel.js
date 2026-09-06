/* NexaHunter profile panel with local create-password / login steps. Loaded after alerts-engine.js. */
(function(){
  function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
  function toast(m){var t=document.querySelector('#toast');if(t){t.textContent=m;t.classList.add('show');setTimeout(function(){t.classList.remove('show')},2500)}}
  async function sha(s){try{var b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return Array.from(new Uint8Array(b)).map(function(x){return x.toString(16).padStart(2,'0')}).join('')}catch(e){return ''}}
  function hasPass(){return !!localStorage.getItem('nh.profile.hash')}
  function loggedIn(){return sessionStorage.getItem('nh.profile.session')==='1'}
  function render(){
    var modal=window.NexaHunter&&window.NexaHunter.modal;if(!modal)return;
    var body,actions;
    if(!hasPass()){
      body='<div class="nh-grid2"><label>Display name<input id="nh-profile-name" maxlength="40" autocomplete="name"></label><label>Email<input id="nh-profile-email" type="email" maxlength="80" autocomplete="email"></label></div><div class="nh-grid2"><label>Create password<input id="nh-profile-pass" type="password" maxlength="64" autocomplete="new-password"></label><label>Confirm password<input id="nh-profile-pass2" type="password" maxlength="64" autocomplete="new-password"></label></div><div class="nh-note">Profile and password are stored locally on this device. Connect Cloudflare Access for SSO.</div>';
      actions='<button type="button" class="blue-btn" id="nh-save-profile">Create Profile</button>';
    }else if(!loggedIn()){
      body='<div class="nh-grid2"><label>Password<input id="nh-profile-pass" type="password" maxlength="64" autocomplete="current-password"></label></div><div class="nh-note">Enter your password to unlock your profile.</div>';
      actions='<button type="button" class="blue-btn" id="nh-login-profile">Log In</button>';
    }else{
      body='<div class="nh-grid2"><label>Display name<input id="nh-profile-name" maxlength="40"></label><label>Email<input id="nh-profile-email" type="email" maxlength="80"></label></div><div class="nh-note">Logged in locally. Changes save to this device. Open Order History from the toolbar.</div>';
      actions='<button type="button" class="blue-btn" id="nh-save-profile">Save Profile</button><button type="button" class="link-btn" id="nh-logout-profile">Log Out</button>';
    }
    modal('Profile',body,actions);
    var m=document.querySelector('#nh-modal');if(!m)return;
    if(!hasPass()){
      m.querySelector('#nh-profile-name').value=localStorage.getItem('nh.profile.name')||'';
      m.querySelector('#nh-profile-email').value=localStorage.getItem('nh.profile.email')||'';
      m.querySelector('#nh-save-profile').onclick=async function(){
        var name=(m.querySelector('#nh-profile-name').value||'').trim();var email=(m.querySelector('#nh-profile-email').value||'').trim();
        var p1=m.querySelector('#nh-profile-pass').value;var p2=m.querySelector('#nh-profile-pass2').value;
        if(p1.length<6){toast('Password must be at least 6 characters');return}
        if(p1!==p2){toast('Passwords do not match');return}
        var h=await sha(p1);if(!h){toast('Security error');return}
        localStorage.setItem('nh.profile.name',name);localStorage.setItem('nh.profile.email',email);localStorage.setItem('nh.profile.hash',h);sessionStorage.setItem('nh.profile.session','1');
        var el=document.querySelector('#nh-modal');if(el)el.remove();toast('Profile created and logged in');render();
      };
    }else if(!loggedIn()){
      m.querySelector('#nh-login-profile').onclick=async function(){
        var h=await sha(m.querySelector('#nh-profile-pass').value);
        if(h&&h===localStorage.getItem('nh.profile.hash')){sessionStorage.setItem('nh.profile.session','1');var el=document.querySelector('#nh-modal');if(el)el.remove();toast('Logged in');render()}
        else{toast('Incorrect password')}
      };
    }else{
      m.querySelector('#nh-profile-name').value=localStorage.getItem('nh.profile.name')||'';
      m.querySelector('#nh-profile-email').value=localStorage.getItem('nh.profile.email')||'';
      m.querySelector('#nh-save-profile').onclick=function(){
        localStorage.setItem('nh.profile.name',(m.querySelector('#nh-profile-name').value||'').trim());
        localStorage.setItem('nh.profile.email',(m.querySelector('#nh-profile-email').value||'').trim());
        var el=document.querySelector('#nh-modal');if(el)el.remove();toast('Profile saved');
      };
      m.querySelector('#nh-logout-profile').onclick=function(){sessionStorage.removeItem('nh.profile.session');var el=document.querySelector('#nh-modal');if(el)el.remove();toast('Logged out');render()};
    }
  }
  function wrap(){var prev=window.NexaHunter&&window.NexaHunter.openPanel;if(prev)window.NexaHunter.openPanel=async function(name){if(name==='Profile')return render();return prev(name)}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(wrap,0)},{once:true});else setTimeout(wrap,0);
})();
