document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(["city","country"], (items)=>{
    if (!chrome.runtime.error) {
      console.log(items);
      document.getElementById("city").value = items.city;
      document.getElementById("country").value = items.country;
      if(items.city && items.country){
        getAndShowTemperature(items.city, items.country);        
      }
    } 
  });

  document.getElementById('addressForm').addEventListener('submit',()=>{
    const city = document.getElementById('city').value;
    const country = document.getElementById('country').value;
    if (!city || !country) {
      console.log('Missing country or city');
      document.getElementById("resp").innerText = 'Missing country or city';
    }
    else{
      chrome.storage.sync.set({'city':city, 'country':country}, ()=>{
        console.log('Settings saved');
      });
      getAndShowTemperature(city, country);
    }
  })
});

function getTemperatur(city, country){
  return new Promise((resolve, reject)=>{
    const xhr = new XMLHttpRequest();
    xhr.open("GET", `http://localhost:8080/currentforcast?city=${city}&country=${country}`, true);
    
    setTimeout(()=>{ reject(new Error("timeOut")) }, 3000);
    
    xhr.onreadystatechange = ()=>{
      if(xhr.readyState == 4 && xhr.status >= 200 && xhr.status < 300){
        try{
          const temp = JSON.parse(xhr.responseText).temp;
          resolve(temp);
        }
        catch(err){
          reject(err);
        }
      }
      else if(xhr.readyState == 4){
        reject(new Error("reqFailed"))
      }
    }
    xhr.send();
  })
}

function getAndShowTemperature(city, country){
 return getTemperatur(city, country).then((temp)=>{
    document.getElementById("resp").innerText = `Current temperature: ${temp} Celsius degrees`;
  })
  .catch((err)=>{
    document.getElementById("resp").innerText = `Something went wrong, check your spelling`;
  })
}





