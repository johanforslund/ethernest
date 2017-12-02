let price = 0;
let balance = 0;
let total = 0;
let yesterdayPrice = 0;
let priceChange = 0;
let totalChange = 0;
let transactions = [];

const timeYesterday = parseInt(Date.now()/1000) - (60*60*24);
const address = getAllUrlParams().address || 0;

const priceDiv = document.querySelector('#price');
const balanceDiv = document.querySelector('#balance');
const totalDiv = document.querySelector('#total');
const addressInput = document.querySelector('#address');
const priceChangeDiv = document.querySelector('#priceChange');
const totalChangeDiv = document.querySelector('#totalChange');
const table = document.querySelector('tbody');

addressInput.addEventListener('change', function() {
  document.querySelector('form').action = `?address=${this.value}`;
});

const p1 = fetch('https://api.etherscan.io/api?module=stats&action=ethprice');
const p2 = fetch(`https://api.etherscan.io/api?module=account&action=balance&address=${address}&tag=latest`);
const p3 = fetch(`http://api.etherscan.io/api?module=account&action=txlist&address=${address}&sort=desc`);
const p4 = fetch(`https://min-api.cryptocompare.com/data/histohour?fsym=ETH&tsym=USD&limit=1&e=Coinbase&toTs=${timeYesterday}`);

Promise
  .all([p1, p2, p3, p4])
  .then(responses => {
    return Promise.all(responses.map(res => res.json()));
  })
  .then(responses => {
    updatePrice(responses[0].result.ethusd);
    updatePriceChange(responses[3].Data[0].close);
    updateBalanceAndTotal(responses[1].result);
    updateTransactions(responses[2].result);
  });

function updatePrice(priceInput) {
  price = parseFloat(priceInput);
  priceDiv.innerHTML = `\$${price}`;
}

function updateBalanceAndTotal(balanceInput) {
  balance = parseFloat(balanceInput)/1000000000000000000;
  total = price * balance;
  totalChange = total - (total/(1+(priceChange/100)));
  balanceDiv.innerHTML = `${balance.toFixed(4)} ETH`;
  totalDiv.innerHTML = `\$${total.toFixed(2)}`;
  totalChangeDiv.innerHTML = `\$${totalChange.toFixed(2)}`;
  if(totalChange >= 0) {
    totalChangeDiv.style.color = 'green';
  } else {
    totalChangeDiv.style.color = 'red';
  }
}

function updateTransactions(transactionsInput) {
  transactions.push(...transactionsInput.map(tx => {
    return {
      value: tx.value,
      timestamp: tx.timeStamp,
      to: tx.to,
      priceThen: 0,
      priceChangeSince: 0,
      updatePriceThen() {
        fetch(`https://min-api.cryptocompare.com/data/pricehistorical?fsym=ETH&tsyms=USD&ts=${this.timestamp}`)
          .then(data => data.json())
          .then(data => {
            this.priceThen = data.ETH.USD;
            this.priceChangeSince = calculatePercentageChange(data.ETH.USD, price);
            createTable(transactions);
          });
      }
    }
  }));
  transactions.forEach((transaction, i) => {
    transactions[i].updatePriceThen();
  });

}

function updatePriceChange(yesterdayPriceInput) {
  priceChange = calculatePercentageChange(yesterdayPriceInput, price);
  priceChangeDiv.innerHTML = `${priceChange.toFixed(2)} %`;
  if(priceChange >= 0) {
    priceChangeDiv.style.color = 'green';
  } else {
    priceChangeDiv.style.color = 'red';
  }
}

function calculatePercentageChange(first, second) {
  return (second - first)/second*100;
}

function createTable(transactions) {
  table.innerHTML = `<tr>
    <th>Value</th>
    <th>Timestamp</th>
    <th>In/Out</th>
    <th>Price then</th>
    <th>Change</th>
  </tr>`;

  transactions.forEach(transaction => {
    const [value, timestamp, to, priceThen, priceChangeSince] = [transaction.value, transaction.timestamp, transaction.to, transaction.priceThen, transaction.priceChangeSince];
    const tr = document.createElement('tr');
    const td1 = document.createElement('td');
    const td2 = document.createElement('td');
    const td3 = document.createElement('td');
    const td4 = document.createElement('td');
    const td5 = document.createElement('td');
    const t1 = document.createTextNode(`${(value/1000000000000000000).toFixed(2)} ETH`);
    const t2 = document.createTextNode(convertTimestamp(timestamp));
    if(to === address.toLowerCase()) {
      inOrOut = "In";
    } else {
      inOrOut = "Out";
    }
    const t3 = document.createTextNode(inOrOut);
    const t4 = document.createTextNode(`\$${priceThen.toFixed(2)}`);
    const t5 = document.createTextNode(`${priceChangeSince.toFixed(2)}%`);
    td1.appendChild(t1);
    td2.appendChild(t2);
    td3.appendChild(t3);
    td4.appendChild(t4);
    td5.appendChild(t5);
    tr.appendChild(td1);
    tr.appendChild(td2);
    tr.appendChild(td3);
    tr.appendChild(td4);
    tr.appendChild(td5);
    table.appendChild(tr);
  })
}

function convertTimestamp(timestamp) {
  var d = new Date(timestamp * 1000),	// Convert the passed timestamp to milliseconds
    yyyy = d.getFullYear(),
    mm = ('0' + (d.getMonth() + 1)).slice(-2),	// Months are zero based. Add leading 0.
    dd = ('0' + d.getDate()).slice(-2),			// Add leading 0.
    hh = d.getHours(),
    h = hh,
    min = ('0' + d.getMinutes()).slice(-2),		// Add leading 0.
    ampm = 'AM',
    time;

  if (hh > 12) {
    h = hh - 12;
    ampm = 'PM';
  } else if (hh === 12) {
    h = 12;
    ampm = 'PM';
  } else if (hh == 0) {
    h = 12;
  }
  time = yyyy + '-' + mm + '-' + dd + ', ' + h + ':' + min + ' ' + ampm;
  return time;
}

function getAllUrlParams(url) {
  var queryString = url ? url.split('?')[1] : window.location.search.slice(1);
  var obj = {};
  if (queryString) {
    queryString = queryString.split('#')[0];
    var arr = queryString.split('&');
    for (var i=0; i<arr.length; i++) {
      var a = arr[i].split('=');
      var paramNum = undefined;
      var paramName = a[0].replace(/\[\d*\]/, function(v) {
        paramNum = v.slice(1,-1);
        return '';
      });
      var paramValue = typeof(a[1])==='undefined' ? true : a[1];
      paramName = paramName;
      paramValue = paramValue;

      if (obj[paramName]) {
        if (typeof obj[paramName] === 'string') {
          obj[paramName] = [obj[paramName]];
        }
        if (typeof paramNum === 'undefined') {
          obj[paramName].push(paramValue);
        }
        else {
          obj[paramName][paramNum] = paramValue;
        }
      }
      else {
        obj[paramName] = paramValue;
      }
    }
  }
  return obj;
}
