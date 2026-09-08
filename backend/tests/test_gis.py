from app.core.gis import (
    bounding_box_around_point,
    geometry_centroid,
    is_in_arabian_sea_operating_area,
)


def test_arabian_sea_operating_area_accepts_basin_coordinates():
    assert is_in_arabian_sea_operating_area(19.0, 72.8)
    assert is_in_arabian_sea_operating_area(10.0, 60.0)
    assert is_in_arabian_sea_operating_area(-4.5, 79.5)


def test_arabian_sea_operating_area_rejects_unrelated_coordinates():
    assert not is_in_arabian_sea_operating_area(35.0, 72.8)
    assert not is_in_arabian_sea_operating_area(10.0, 90.0)


def test_bounding_box_uses_km_based_longitude_width():
    low_lat_box = bounding_box_around_point(lat=5.0, lon=60.0, radius_km=15.0)
    high_lat_box = bounding_box_around_point(lat=25.0, lon=60.0, radius_km=15.0)

    low_width = low_lat_box["coordinates"][0][1][0] - low_lat_box["coordinates"][0][0][0]
    high_width = high_lat_box["coordinates"][0][1][0] - high_lat_box["coordinates"][0][0][0]

    assert high_width > low_width


def test_geometry_centroid_ignores_closing_coordinate():
    polygon = {
        "type": "Polygon",
        "coordinates": [[
            [59.0, 9.0],
            [61.0, 9.0],
            [61.0, 11.0],
            [59.0, 11.0],
            [59.0, 9.0],
        ]],
    }

    assert geometry_centroid(polygon) == (60.0, 10.0)
