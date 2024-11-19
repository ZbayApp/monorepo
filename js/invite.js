// Use custom protocol to open Quiet app
document.addEventListener(
  'click',
  function (event) {
    if (!event.target.matches('#joincommunity')) return
    event.preventDefault()

    var hash = window.location.hash

    var invitationCode = hash.substring(1)

    // Ensure backward compatibility
    if (hash.includes("code=")) {
      invitationCode = hash.substring(6)
    }
    
    if (!invitationCode) {
      window.alert('Sorry, no invitation code has been passed with the URL.')
      return
    }

    if (invitationCode?.length < 56) {
      window.alert("Sorry, this doesn't seem to be a valid invitation code.")
      return
    }

    // Backward compatibility for only-address invitation code
    if (invitationCode?.length === 56) {
      window.location = `quiet://?code=${invitationCode}`
      return
    }

    window.location = `quiet://?${invitationCode}`
  },
  false
)

// Detects platform and display correct links on tryquiet.org/join
function getPlatform() {
  const primaryActionEl = document.getElementById("qt-download-action")
  const platform = navigator.userAgent

  if (/iPhone|iPad|iPod/i.test(platform)) {
    primaryActionEl.innerHTML = `
  <a href="https://testflight.apple.com/join/yaUjeiW7" target="_blank" aria-label="Download at App Store">Download
          </a>
  `;

} else if (/Macintosh|Mac OS X/i.test(platform)) {
    primaryActionEl.innerHTML = `
<a href="../index.html#Downloads" target="_blank" aria-label="Go to download section, opens in a new tab">Download
</a>
  `;

} else if (/Windows/i.test(platform)) {
  primaryActionEl.innerHTML = `
<a href="../index.html#Downloads" target="_blank" aria-label="Go to download section, opens in a new tab">Download
</a>
`;

} else if (/Linux/i.test(platform) && !/Android/i.test(platform)) {
  primaryActionEl.innerHTML = `
<a href="../index.html#Downloads" target="_blank" aria-label="Go to download section, opens in a new tab">Download
</a>
`;

} else if (/Android/i.test(platform)) {
  primaryActionEl.innerHTML = `
<a href="https://play.google.com/store/apps/details?id=com.quietmobile" style="display: block; margin-bottom: 30px;" aria-label="Download at Play Store">
  Download
</a>
`;

} else {
  primaryActionEl.innerHTML = `
<a href="../index.html#Downloads" target="_blank" aria-label="Go to download section, opens in a new tab">Download
</a>
`;
}
    
  }


onload = getPlatform
