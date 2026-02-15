export interface GridCellDescriptor {
	cellId: string;
	level: number;
	centerLat: number;
	centerLng: number;
	queryRadiusM: number;
}

export interface NearbySearchRequest {
	cellId: string;
	requestBody: {
		locationRestriction: {
			circle: {
				center: {
					latitude: number;
					longitude: number;
				};
				radius: number;
			};
		};
		includedTypes?: string[];
		excludedTypes?: string[];
		maxResultCount: number;
	};
	fieldMask: string;
}
