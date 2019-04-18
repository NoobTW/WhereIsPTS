var API_PATH = 'https://whereispts-api.herokuapp.com';
var map;
var currentPosition = null;
var currentMarker = null;
var markers = [];

map = L.map('map').setView([23.705875, 120.951009], 8);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	attribution: '<a href="https://www.openstreetmap.org/">OSM</a>',
	maxZoom: 18,
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
	var popLocation= e.latlng;
	L.popup()
		.setLatLng(popLocation)
		.setContent('<div>想 <a href="#" id="report" data-lat="' + e.latlng.lat + '" data-lng="' + e.latlng.lng + '" data-toggle="modal" data-target="#modalReport">回報新店家</a> 嗎？</div>')
		.openOn(map);
});

map.on('moveend', function() {
	var center = map.getCenter();
	Array.from(markers).forEach(function(m) {
		map.removeLayer(m);
	});
	markers = [];
	getNearbyStore([center.lat, center.lng])
})

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
	$('#modalReport').modal('show');
});

$('#report-new').tooltip({ trigger: 'click' });

$('#form-report').on('submit', function(e) {
	e.preventDefault();
	var formData = new FormData($('#form-report')[0]);
	formData.append('switchable', $('#form-report input[type="checkbox"]:checked').length > 0 ? true : false);
	formData.delete('id');
	var storeId = $('#form-report input[name="id"]').val().trim() || '';
	if (storeId === '') {
		$.ajax({
			url: API_PATH + '/api/store',
			method: 'POST',
			data: formData,
			processData: false,
			contentType: false,
			success: function() {
				Array.from(markers).forEach(function(m) {
					map.removeLayer(m);
				});
				markers = [];
				var center = map.getCenter();
				getNearbyStore([center.lat, center.lng])
				getNearbyStore(currentPosition)
			}
		});
	} else {
		$.ajax({
			url: API_PATH + '/api/store/' + storeId,
			method: 'PUT',
			data: formData,
			processData: false,
			contentType: false,
			success: function() {
				Array.from(markers).forEach(function(m) {
					map.removeLayer(m);
				});
				markers = [];
				var center = map.getCenter();
				getNearbyStore([center.lat, center.lng])
				getNearbyStore(currentPosition)
			}
		});
	}

	$('#modalReport').modal('hide');
});

function getNearbyStore(latlng, cb) {
	$.getJSON(API_PATH + '/api/search/' + latlng[0] + ',' + latlng[1], function(stores) {
		markers = [];
		Array.from(stores).forEach(function(store) {
			var m = L.marker([store.lat, store.lng]);
			m.store = store;
			m.addTo(map);
			m.bindPopup('<div>'
			+ '<div><strong>店家名稱：</strong>' + escapeHtml(store.name) + '</div>'
			+ '<div><strong>店家地址：</strong>' + escapeHtml(store.address) + '</div>'
			+ '<div><strong>新聞頻道：</strong>' + escapeHtml(store.news) + '</div>'
			+ '<div><strong>可否轉臺：</strong>' + (store.switchable === true ? '可以' : '不行') + '</div>'
			+ '<div><small class="float-right text-muted"><a href="#" class="text-muted edit" data-store-id="' + store.id
				+ '">我要修改</a> | 上次回報：' + dayjs(store.lastModified).format('MM-DD HH:mm') + '</small></div>'
			+ '</div>')
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