var API_PATH = 'http://gundambox.ddns.net:6480';
var map;
var currentPosition = null;
var lastSearchPosition = null;
var currentMarker = null;
var markers = [];

map = L.map('map').setView([23.705875, 120.951009], 8);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	attribution: '<a href="https://www.openstreetmap.org/">OSM</a>',
	maxZoom: 19,
}).addTo(map);

if (navigator.geolocation) {
	navigator.geolocation.getCurrentPosition(function(position) {
		currentPosition = [position.coords.latitude, position.coords.longitude];
		map.flyTo(currentPosition, 15);
		currentMarker = L.marker(currentPosition, {
			icon: L.divIcon({className: 'currentMarker', iconSize: [16, 16],}),
		});
		currentMarker.addTo(map);
		getNearbyStore(currentPosition)
	}, function(error) {
		alert(error.message)
	});
	navigator.geolocation.watchPosition(function(position) {
		currentPosition = [position.coords.latitude, position.coords.longitude];
		currentMarker.setLatLng(currentPosition);
	});
}

map.on('click', function(e) {
	hideInfo();
	var popLocation= e.latlng;
	$('#modalReport .form-group').show();
	$('#form-report').data('type', 'new');
	$('#form-report').removeAttr('novalidate');
	L.popup()
		.setLatLng(popLocation)
		.setContent('<div>想 <a href="#" id="report" data-lat="' + e.latlng.lat + '" data-lng="' + e.latlng.lng + '" data-toggle="modal" data-target="#modalReport">回報新店家</a> 嗎？</div>')
		.openOn(map);
});

map.on('moveend', function() {
	var center = map.getCenter();
	if (distance([center.lat, center.lng], lastSearchPosition) >= 5) {
		Array.from(markers).forEach(function(m) {
			map.removeLayer(m);
		});
		markers = [];
		getNearbyStore([center.lat, center.lng]);
	}
});

$('body').delegate('#report', 'click', function(e) {
	$('#modalReport input').each(function(i, el) {
		$(el).val('');
	});
	$('#modal-lat').val($(e.target).data('lat'));
	$('#modal-lng').val($(e.target).data('lng'));
	map.closePopup();
});

$('body').delegate('.edit', 'click', function(e) {
	var storeId = $(e.target).data('store-id');
	var m = markers.find(x => x.store.id === storeId);
	if (m) {
		var store = m.store;
		Object.keys(store).forEach(function(key) {
			$('#modalReport input[name="' + key + '"]').val(store[key]);
			$('#modalReport select[name="' + key + '"]').val(store[key]);
		});
		if (store.switchable) $('#modalReport input[type="checkbox"]').attr('checked', true);
	}
	$('#form-report').data('type', 'edit');
	$('#modalReport .form-group').show();
	$('#modalReport .form-group.vote-news').hide();
	$('#form-report').removeAttr('novalidate');
	$('#modalReport').modal('show');
});

$('body').delegate('.vote', 'click', function(e) {
	var storeId = $(e.target).data('store-id');
	var m = markers.find(x => x.store.id === storeId);
	if (m) {
		var store = m.store;
		Object.keys(store).forEach(function(key) {
			$('#modalReport input[name="' + key + '"]').val(store[key]);
			$('#modalReport select[name="' + key + '"]').val(store[key]);
		});
		if (store.switchable) $('#modalReport input[type="checkbox"]').attr('checked', true);
	}
	$('#form-report').data('type', 'vote');
	$('#modalReport .form-group').hide();
	$('#modalReport .form-group.vote-news').show();
	$('#form-report').attr('novalidate', 'novalidate');
	$('#modalReport').modal('show');
});

$('#report-new').tooltip({ trigger: 'click' });

$('#form-report').on('submit', function(e) {
	e.preventDefault();
	var formData = new FormData($('#form-report')[0]);
	formData.append('switchable', $('#form-report input[type="checkbox"]:checked').length > 0 ? true : false);
	formData.delete('id');
	var storeId = $('#form-report input[name="id"]').val().trim() || '';
	switch ($('#form-report').data('type')) {
		case 'new':
			$.ajax({
				url: API_PATH + '/api/v1/store',
				method: 'POST',
				data: formData,
				processData: false,
				contentType: false,
				success: function(res) {
					Array.from(markers).forEach(function(m) {
						map.removeLayer(m);
					});
					markers = [];
					var center = map.getCenter();
					if (res.sid) {
						$.ajax({
							url: API_PATH + '/api/v1/vote/store/' + res.sid,
							method: 'POST',
							data: { cid: $('#form-report select').val() },
							success: function() {
								getNearbyStore([center.lat, center.lng]);
							}
						});
					}
				}
			});
			break;
		case 'edit':
			$.ajax({
				url: API_PATH + '/api/v1/store/' + storeId,
				method: 'PUT',
				data: formData,
				processData: false,
				contentType: false,
				success: function() {
					Array.from(markers).forEach(function(m) {
						map.removeLayer(m);
					});
					markers = [];
					hideInfo();
					var center = map.getCenter();
					getNearbyStore([center.lat, center.lng], function() {
						markers.find(x => x.store.id === ~~storeId)._events.click[0].fn();
					});
				}
			});
			break;
		case 'vote':
			$.ajax({
				url: API_PATH + '/api/v1/vote/store/' + storeId,
				method: 'POST',
				data: { cid: $('#form-report select').val() },
				success: function() {
					Array.from(markers).forEach(function(m) {
						map.removeLayer(m);
					});
					markers = [];
					hideInfo();
					var center = map.getCenter();
					getNearbyStore([center.lat, center.lng], function() {
						markers.find(x => x.store.id === ~~storeId)._events.click[0].fn();
					});
				}
			});
			break;
	}

	$('#modalReport').modal('hide');
});

function getNearbyStore(latlng, cb) {
	lastSearchPosition = latlng;
	$.getJSON(API_PATH + '/api/v1/store/list?lat=' + latlng[0] + '&lng=' + latlng[1], function(res) {
		markers = [];
		var stores = res.result;
		Array.from(stores).forEach(function(store) {
			var m = L.marker(store.location);
			m.store = store;
			m.store.id = store.sid;
			m.store.lat = store.location[0];
			m.store.lng = store.location[1];
			m.addTo(map);
			var maxChannel = 0;
			var maxChannelCount = Number.MIN_SAFE_INTEGER;
			Array.from(store.votes).forEach(function(vote) {
				if (vote.vote_count > maxChannelCount) {
					maxChannelCount = vote.vote_count;
					maxChannel = vote.channel;
				}
			});
			m.on('click', function () {
				showInfo(
				'<h2>' + escapeHtml(store.name) + '</h2>'
				+ '<div><i class="fas fa-map-marker-alt"></i> ' + escapeHtml(store.address) + '</div>'
				+ '<div><i class="fas fa-tv"></i> ' + ( maxChannel ? (
					queryNews(maxChannel) + '<span class="badge ml-2 ' + (store.switchable === true ? 'badge-success">可以轉臺</span>' : 'badge-success">不能轉臺</span>')
				 ) : '無' )
				 + '</div>'
				+ '<div><canvas id="news-vote-chart"></canvas></div>'
				+ '<div class="mt-2">'
				+ '<button href="#" class="btn btn-sm btn-outline-primary vote" data-store-id="' + store.id
				+ '">我要回報新聞頻道</button>'
				+ '<button href="#" class="btn btn-sm btn-outline-info ml-1 edit" data-store-id="' + store.id
				+ '">我要修改</button>'
				+ '<div class="text-muted float-right"><small>上次回報：' + dayjs(store.lastModified).format('MM-DD HH:mm') + '</small></div>'
				+ '</div>'
				);
				map.invalidateSize();
				map.flyTo(store.location, 18);
				if (store.votes) {
					var votes = store.votes.sort(function(a, b) { return b.vote_count - a.vote_count });
					var chart = new Chart($('#news-vote-chart'), {
						type: 'horizontalBar',
						data: {
							labels: votes.map(function(x) { return queryNews(x.channel) }),
							datasets: [{
								label: '民眾回報的店家新聞',
								backgroundColor: 'rgb(255, 99, 132)',
								borderColor: 'rgb(255, 99, 132)',
								data: votes.map(function(x) { return x.vote_count })
							}]
						},
						options: {
							scales: {
								xAxes: [{
									ticks: {
										beginAtZero: true
									}
								}]
							}
						}
					});
				}
			});
			// m.on('click', function(e) {
				// console.log(e.target)
			// })
			markers.push(m);
		});
		if (cb) cb(stores);
	});
}

function escapeHtml(unsafe) {
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

function queryNews(sid) {
	var news = ['公視新聞', 'TVBS 新聞', '中天新聞', '民視新聞', '中視新聞', '華視新聞',
	'三立新聞', '東森新聞', '年代新聞', '非凡新聞', '壹電視新聞', '體育新聞', '不是新聞'];

	return news[sid - 1];
}

function showInfo(info) {
	$('#infoView').addClass('col-md-3').removeClass('hide').html(info);
	$('#mapView').addClass('col-md-9').removeClass('col-md-12');
	if (window.innerWidth < 760) {
		$('#infoView').addClass('h-50').removeClass('h-100');
		$('#mapView').addClass('h-50').removeClass('h-100');
	}
}

function hideInfo() {
	$('#infoView').removeClass('col-md-3').addClass('hide');
	$('#mapView').addClass('col-md-12').removeClass('col-md-9');
	$('#mapView').addClass('h-100').removeClass('h-50');
}

function distance(pos1, pos2) {
	var R = 6371;
	var dLat = deg2rad(pos2[0]-pos1[0]);
	var dLon = deg2rad(pos2[1]-pos1[1]);
	var a =
		Math.sin(dLat/2) * Math.sin(dLat/2) +
		Math.cos(deg2rad(pos1[0])) * Math.cos(deg2rad(pos2[0])) *
		Math.sin(dLon/2) * Math.sin(dLon/2)
		;
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
	var d = R * c;
	return d;
}

function deg2rad(deg) {
return deg * (Math.PI/180)
}