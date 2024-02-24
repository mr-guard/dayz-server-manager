class DZSMDumpEntry : Managed
{
	string classname;
	string source;

	ref TStringArray parents;

	void ~DZSMDumpEntry() {
		delete parents;
	}

	void Init(string classnameParam, string sourceParam)
	{
		classname = classnameParam;
		source = sourceParam;

		parents = new TStringArray;
		string child = classname;
		string parent;
		while (GetGame().ConfigGetBaseName(source + " " + child, parent))
		{
			if (parent && child != parent)
			{
				parents.Insert(parent);
			}
			else
			{
				break;
			}
			child = parent;
		}

	}
}

class DZSMBaseDumpEntry : DZSMDumpEntry
{
	string displayName;
	float hitPoints;
	
	float weight;
	ref TIntArray size;

	ref TIntArray repairableWithKits;
	ref TFloatArray repairCosts;

	ref TStringArray inventorySlot;
	string lootCategory;
	ref TStringArray lootTag;
	ref TStringArray itemInfo;

	void ~DZSMBaseDumpEntry() {
		delete size;
		delete repairableWithKits;
		delete repairCosts;
		delete inventorySlot;
		delete lootTag;
		delete itemInfo;
	}

	override void Init(string classnameParam, string sourceParam)
	{
		super.Init(classnameParam, sourceParam);

		displayName = GetGame().ConfigGetTextOut( source + " " + classname + " displayName" );
		hitPoints = GetGame().ConfigGetFloat( source + " " + classname + " DamageSystem GlobalHealth Health hitpoints" );

		weight = GetGame().ConfigGetFloat( source +" " + classname + " weight" );
		size = new TIntArray;
		GetGame().ConfigGetIntArray( source + " " + classname + " itemSize", size );

		repairableWithKits = new TIntArray;
		GetGame().ConfigGetIntArray( source + " " + classname + " repairableWithKits", repairableWithKits );
		repairCosts = new TFloatArray;
		GetGame().ConfigGetFloatArray( source + " " + classname + " repairCosts", repairCosts );

		inventorySlot = new TStringArray;
		GetGame().ConfigGetTextArray( source + " " + classname + " inventorySlot", inventorySlot );
		
		lootCategory = GetGame().ConfigGetTextOut( source + " " + classname + " lootCategory" );
		lootTag = new TStringArray;
		GetGame().ConfigGetTextArray( source + " " + classname + " lootTag", lootTag );

		itemInfo = new TStringArray;
		GetGame().ConfigGetTextArray( "cfgVehicles " + classname + " itemInfo", itemInfo);
	}
}


class DZSMAmmoDumpEntry : DZSMDumpEntry
{
	string displayName;
	string projectile;

	string simulation;

	float hit;
	float indirectHit;
	float indirectHitRange;

	float initSpeed;
	float typicalSpeed;
	float airFriction;
	
	bool tracer;
	bool explosive;
	float ttl;

	float weight;
	float caliber;
	float projectilesCount;
	float deflecting;
	
	float noiseHit;

	// ref TFloatArray damageOverride;
	float damageHP;
	float damageBlood;
	float damageShock;
	float damageArmor;


	void DZSMAmmoDumpEntry(string classnameParam)
	{
		Init(classnameParam, "cfgMagazines");

		displayName = GetGame().ConfigGetTextOut( "cfgMagazines " + classname + " displayName" );
		projectile = GetGame().ConfigGetTextOut( "cfgMagazines " + classname + " ammo" );
		
		simulation = GetGame().ConfigGetTextOut( "cfgAmmo " + projectile + " simulation" );

		hit = GetGame().ConfigGetFloat( "cfgAmmo " + projectile + " hit" );
		indirectHit = GetGame().ConfigGetFloat( "cfgAmmo " + projectile + " indirectHit" );
		indirectHitRange = GetGame().ConfigGetFloat( "cfgAmmo " + projectile + " indirectHitRange" );
		initSpeed = GetGame().ConfigGetFloat( "cfgAmmo " + projectile + " initSpeed" );
		typicalSpeed = GetGame().ConfigGetFloat( "cfgAmmo " + projectile + " typicalSpeed" );
		airFriction = GetGame().ConfigGetFloat( "cfgAmmo " + projectile + " airFriction" );
		
		tracer = GetGame().ConfigGetFloat( "cfgAmmo " + projectile + " tracerStartTime" ) > -1.0;
		explosive = GetGame().ConfigGetInt( "cfgAmmo " + projectile + " explosive" ) > 0.0;
		ttl = GetGame().ConfigGetFloat( "cfgAmmo " + projectile + " timeToLive" );
		
		weight = GetGame().ConfigGetFloat( "cfgAmmo " + projectile + " weight" );
		caliber = GetGame().ConfigGetFloat( "cfgAmmo " + projectile + " caliber" );
		projectilesCount = Math.Max(1.0, GetGame().ConfigGetFloat( "cfgAmmo " + projectile + " projectilesCount" ));
		deflecting = GetGame().ConfigGetFloat( "cfgAmmo " + projectile + " deflecting" );
		
		noiseHit = GetGame().ConfigGetFloat( "cfgAmmo " + projectile + " NoiseHit strength" );
		
		// damageOverride = GetGame().ConfigGetTextOut( "cfgAmmo " + projectile + " DamageApplied defaultDamageOverride" );
		// damageOverride = new TFloatArray;
		// GetGame().ConfigGetFloatArray( "cfgAmmo " + projectile + " DamageApplied defaultDamageOverride 0", damageOverride );
		
		damageArmor = GetGame().ConfigGetFloat( "cfgAmmo " + projectile + " DamageApplied Health armorDamage" );
		damageHP = GetGame().ConfigGetFloat( "cfgAmmo " + projectile + " DamageApplied Health damage" );
		damageBlood = GetGame().ConfigGetFloat( "cfgAmmo " + projectile + " DamageApplied Blood damage" );
		damageShock = GetGame().ConfigGetFloat( "cfgAmmo " + projectile + " DamageApplied DamageShock damage" );
	}
}

static void DZSMAmmoDump()
{
    string filepath = "$profile:dzsm-ammodump.json";
	if (FileExist(filepath))
	{
		return;
	}
	array<ref DZSMAmmoDumpEntry> list = new array<ref DZSMAmmoDumpEntry>;
    int nClasses = GetGame().ConfigGetChildrenCount( "cfgMagazines" );
    for ( int nClass = 0; nClass < nClasses; ++nClass )
	{
    	string className;
    	GetGame().ConfigGetChildName( "cfgMagazines", nClass, className );
		if (GetGame().IsKindOf(className, "Ammunition_Base") && GetGame().ConfigGetInt( "cfgMagazines " + className + " scope" ) == 2) {
			list.Insert(new DZSMAmmoDumpEntry(className));
		}
    }
	JsonFileLoader<array<ref DZSMAmmoDumpEntry>>.JsonSaveFile(filepath, list);
}

class DZSMMagDumpEntry : DZSMDumpEntry
{
	string displayName;
	string projectile;

	float weight;
	float capacity;
	float weightPerQuantityUnit;

	ref TIntArray size;
	ref TStringArray ammo;
	
	void DZSMMagDumpEntry(string classnameParam)
	{
		Init(classnameParam, "cfgMagazines");

		displayName = GetGame().ConfigGetTextOut( "cfgMagazines " + classname + " displayName" );
		projectile = GetGame().ConfigGetTextOut( "cfgMagazines " + classname + " ammo" );

		weight = GetGame().ConfigGetFloat( "cfgMagazines " + classname + " weight" );
		weightPerQuantityUnit = GetGame().ConfigGetFloat( "cfgMagazines " + classname + " weightPerQuantityUnit" );
		capacity = GetGame().ConfigGetFloat( "cfgMagazines " + classname + " count" );
		
		size = new TIntArray;
		GetGame().ConfigGetIntArray( "cfgMagazines " + classname + " itemSize", size);
		ammo = new TStringArray;
		GetGame().ConfigGetTextArray( "cfgMagazines " + classname + " ammoItems", ammo);
	}

	void ~DZSMMagDumpEntry()
	{
		delete size;
		delete ammo;
	}
}

static void DZSMMagDump()
{
    string filepath = "$profile:dzsm-magdump.json";
	if (FileExist(filepath))
	{
		return;
	}
	array<ref DZSMMagDumpEntry> list = new array<ref DZSMMagDumpEntry>;
    int nClasses = GetGame().ConfigGetChildrenCount( "cfgMagazines" );
    for ( int nClass = 0; nClass < nClasses; ++nClass )
	{
    	string className;
    	GetGame().ConfigGetChildName( "cfgMagazines", nClass, className );
		if (GetGame().IsKindOf(className, "Magazine_Base") && GetGame().ConfigGetInt( "cfgMagazines " + className + " scope" ) == 2) {
			list.Insert(new DZSMMagDumpEntry(className));
		}
    }
	JsonFileLoader<array<ref DZSMMagDumpEntry>>.JsonSaveFile(filepath, list);
}

class DZSMWeaponModeDumpEntry : Managed
{
	string name;
	float rpm;
	float dispersion;
	float rounds;

	void DZSMWeaponModeDumpEntry(string nameParam, float rpmParam, float dispersionParam, float roundsParam)
	{
		name = nameParam;
		rpm = rpmParam;
		dispersion = dispersionParam;
		if (roundsParam)
		{
			rounds = roundsParam;
		}
		else
		{
			rounds = 1;
		}
	}
}

class DZSMWeaponDumpEntry : DZSMBaseDumpEntry
{
	static ref array< string > m_ItemsThatCrash =
	{
		"itemoptics",
		"quickiebow",
		"m203",
		"gp25",
		"gp25_standalone",
		"gp25_base",
		"m203_base",
		"m203_standalone",
		"archery_base",
		"A2HKM5_SD"
	};
	
	float noise;
	float magazineSwitchTime;
	float initSpeedMultiplier;

    float opticsDistanceZoomMin;
	float opticsDistanceZoomMax;
	ref TFloatArray opticsDiscreteDistance;

	float recoilMouseOffsetRangeMin;
	float recoilMouseOffsetRangeMax;
	float recoilMouseOffsetDistance;
	float recoilMouseOffsetRelativeTime;

	float recoilCamOffsetDistance;
	float recoilCamOffsetRelativeTime;
	
	ref TFloatArray recoilModifier;
	ref TFloatArray swayModifier;

	int chamberSize;
	int barrels;
	
    string color;

	ref TStringArray ammo;
	ref TStringArray mags;
	ref TStringArray attachments;

	ref array<ref DZSMWeaponModeDumpEntry> modes;
	
	void DZSMWeaponDumpEntry(string classnameParam)
	{
		Init(classnameParam, "cfgWeapons");

		noise = GetGame().ConfigGetFloat( "cfgWeapons " + classname + " NoiseShoot strength" );
		magazineSwitchTime = GetGame().ConfigGetFloat( "cfgWeapons " + classname + " magazineSwitchTime" );
		initSpeedMultiplier = GetGame().ConfigGetFloat( "cfgWeapons " + classname + " initSpeedMultiplier" );
		
		ammo = new TStringArray;
		GetGame().ConfigGetTextArray( "cfgWeapons " + classname + " chamberableFrom", ammo);
		mags = new TStringArray;
		GetGame().ConfigGetTextArray( "cfgWeapons " + classname + " magazines", mags);
		attachments = new TStringArray;
		GetGame().ConfigGetTextArray( "cfgWeapons " + classname + " attachments", attachments);
		
		chamberSize = GetGame().ConfigGetInt( "cfgWeapons " + classname + " chamberSize" );
		TStringArray muzzles = new TStringArray;
		GetGame().ConfigGetTextArray( "cfgWeapons " + classname + " muzzles", muzzles);
		barrels = muzzles.Count();
		delete muzzles;
		
        color = GetGame().ConfigGetTextOut( "cfgWeapons " + classname + " color" );
		
		modes = new array<ref DZSMWeaponModeDumpEntry>;
		
		TStringArray modesList = new TStringArray;
		GetGame().ConfigGetTextArray( "cfgWeapons " + classname + " modes", modesList);
		for ( int i = 0; i < modesList.Count(); i++ )
		{
			float reloadTime = GetGame().ConfigGetFloat( "cfgWeapons " + classname + " " + modesList[i] + " reloadTime" );
			if (reloadTime)
			{
				float rpm = 60.0 / reloadTime;
			}
			float dispersion = GetGame().ConfigGetFloat( "cfgWeapons " + classname + " " + modesList[i] + " dispersion" );
			float rounds = GetGame().ConfigGetFloat( "cfgWeapons " + classname + " " + modesList[i] + " burst" );
			modes.Insert(new DZSMWeaponModeDumpEntry(modesList[i], rpm, dispersion, rounds));
		}

		recoilModifier = new TFloatArray;
		GetGame().ConfigGetFloatArray( "cfgWeapons " + classname + " recoilModifier", recoilModifier);
		swayModifier = new TFloatArray;
		GetGame().ConfigGetFloatArray( "cfgWeapons " + classname + " swayModifier", swayModifier);

        if (GetGame().ConfigIsExisting( "cfgWeapons " + classname + " OpticsInfo distanceZoomMin" ))
		{
			opticsDistanceZoomMin = GetGame().ConfigGetFloat( "cfgWeapons " + classname + " OpticsInfo distanceZoomMin" );
			opticsDistanceZoomMax = GetGame().ConfigGetFloat( "cfgWeapons " + classname + " OpticsInfo distanceZoomMax" );
			opticsDiscreteDistance = new TFloatArray;
			GetGame().ConfigGetFloatArray( "cfgWeapons " + classname + " OpticsInfo discreteDistance", opticsDiscreteDistance );
		}

		if (!CheckItemCrash(classname))
		{
			Print("DZSM Dump ~ Determining recoil for " + classname);
			Weapon_Base ent;
			if ( !Class.CastTo( ent, GetGame().CreateObjectEx( classname, "0 0 0", ECE_CREATEPHYSICS ) ) )
				return;
			
			RecoilBase recoil = ent.SpawnRecoilObject();

			recoilMouseOffsetRangeMin = recoil.m_MouseOffsetRangeMin;
			recoilMouseOffsetRangeMax = recoil.m_MouseOffsetRangeMax;
			recoilMouseOffsetDistance = recoil.m_MouseOffsetDistance;
			recoilMouseOffsetRelativeTime = recoil.m_MouseOffsetRelativeTime;
		
			recoilCamOffsetDistance = recoil.m_CamOffsetDistance;
			recoilCamOffsetRelativeTime = recoil.m_CamOffsetRelativeTime;

			GetGame().ObjectDelete( ent );
		}
	}

	void ~DZSMWeaponDumpEntry()
	{
		delete ammo;
		delete mags;
		delete attachments;
		delete modes;
		delete recoilModifier;
		if (opticsDiscreteDistance)
		{
			delete opticsDiscreteDistance;
		}
		if (swayModifier)
		{
			delete swayModifier;
		}
		if (recoilModifier)
		{
			delete recoilModifier;
		}
	}

	private bool CheckItemCrash( string name )
	{
		for (int i = 0; i < m_ItemsThatCrash.Count(); i++)
		{
			if ( m_ItemsThatCrash[i] == name )
			{
				return true;
			}
		}
		return false;
	}
}

static void DZSMWeaponDump()
{
    string filepath = "$profile:dzsm-weapondump.json";
	if (FileExist(filepath))
	{
		return;
	}
	array<ref DZSMWeaponDumpEntry> list = new array<ref DZSMWeaponDumpEntry>;
    int nClasses = GetGame().ConfigGetChildrenCount( "cfgWeapons" );
    for ( int nClass = 0; nClass < nClasses; ++nClass )
	{
    	string className;
    	GetGame().ConfigGetChildName( "cfgWeapons", nClass, className );
		if (GetGame().IsKindOf(className, "Weapon_Base") && GetGame().ConfigGetInt( "cfgWeapons " + className + " scope" ) == 2) {
			list.Insert(new DZSMWeaponDumpEntry(className));
		}
    }
	
	Print(string.Format("DZSM Dump ~ Weapon dump: %1 classes", list.Count()));
	
	JsonFileLoader<array<ref DZSMWeaponDumpEntry>>.JsonSaveFile(filepath, list);
}

class DZSMClothingDumpEntry : DZSMBaseDumpEntry
{
	float heatIsolation;
	float visibilityModifier;
	float quickBarBonus;
	float durability;
	
	float armorProjectileHP;
	float armorProjectileBlood;
	float armorProjectileShock;
	
	float armorMeleeHP;
	float armorMeleeBlood;
	float armorMeleeShock;
	
	float armorFragHP;
	float armorFragBlood;
	float armorFragShock;
	
	float armorInfectedHP;
	float armorInfectedBlood;
	float armorInfectedShock;

	ref TIntArray cargoSize;
	
	ref TStringArray attachments;
	
	void DZSMClothingDumpEntry(string classnameParam)
	{
		Init(classnameParam, "cfgVehicles");

		heatIsolation = GetGame().ConfigGetFloat( "cfgVehicles " + classname + " heatIsolation" );
		visibilityModifier = GetGame().ConfigGetFloat( "cfgVehicles " + classname + " visibilityModifier" );
		quickBarBonus = GetGame().ConfigGetFloat( "cfgVehicles " + classname + " quickBarBonus" );
		durability = GetGame().ConfigGetFloat( "cfgVehicles " + classname + " durability" );
	
		armorProjectileHP = GetGame().ConfigGetFloat( "cfgVehicles " + classname + " DamageSystem GlobalArmor Projectile Health damage" );
		armorProjectileBlood = GetGame().ConfigGetFloat( "cfgVehicles " + classname + " DamageSystem GlobalArmor Projectile Blood damage" );
		armorProjectileShock = GetGame().ConfigGetFloat( "cfgVehicles " + classname + " DamageSystem GlobalArmor Projectile Shock damage" );
	
		armorMeleeHP = GetGame().ConfigGetFloat( "cfgVehicles " + classname + " DamageSystem GlobalArmor Melee Health damage" );
		armorMeleeBlood = GetGame().ConfigGetFloat( "cfgVehicles " + classname + " DamageSystem GlobalArmor Melee Blood damage" );
		armorMeleeShock = GetGame().ConfigGetFloat( "cfgVehicles " + classname + " DamageSystem GlobalArmor Melee Shock damage" );
	
		armorFragHP = GetGame().ConfigGetFloat( "cfgVehicles " + classname + " DamageSystem GlobalArmor FragGrenade Health damage" );
		armorFragBlood = GetGame().ConfigGetFloat( "cfgVehicles " + classname + " DamageSystem GlobalArmor FragGrenade Blood damage" );
		armorFragShock = GetGame().ConfigGetFloat( "cfgVehicles " + classname + " DamageSystem GlobalArmor FragGrenade Shock damage" );
	
		armorInfectedHP = GetGame().ConfigGetFloat( "cfgVehicles " + classname + " DamageSystem GlobalArmor Infected Health damage" );
		armorInfectedBlood = GetGame().ConfigGetFloat( "cfgVehicles " + classname + " DamageSystem GlobalArmor Infected Blood damage" );
		armorInfectedShock = GetGame().ConfigGetFloat( "cfgVehicles " + classname + " DamageSystem GlobalArmor Infected Shock damage" );

		cargoSize = new TIntArray;
		GetGame().ConfigGetIntArray( "cfgVehicles " + classname + " itemscargoSize", cargoSize);
	
		attachments = new TStringArray;
		GetGame().ConfigGetTextArray( "cfgVehicles " + classname + " attachments", attachments);
	}

	void ~DZSMClothingDumpEntry()
	{
		delete cargoSize;
		delete attachments;
	}
}

static void DZSMClothingDump()
{
	string filepath = "$profile:dzsm-clothingdump.json";
	if (FileExist(filepath))
	{
		return;
	}

	array<ref DZSMClothingDumpEntry> list = new array<ref DZSMClothingDumpEntry>;
    int nClasses = GetGame().ConfigGetChildrenCount( "cfgVehicles" );
    for ( int nClass = 0; nClass < nClasses; ++nClass )
	{
    	string className;
    	GetGame().ConfigGetChildName( "cfgVehicles", nClass, className );
		if (GetGame().IsKindOf(className, "Clothing") && GetGame().ConfigGetInt( "cfgVehicles " + className + " scope" ) == 2) {
			list.Insert(new DZSMClothingDumpEntry(className));
		}
    }
	JsonFileLoader<array<ref DZSMClothingDumpEntry>>.JsonSaveFile(filepath, list);
}

class DZSMNutritionDumpEntry : Managed
{
	float fullnessIndex = 1;
	float energy = -10;
	float water = 1;
	float nutritionalIndex = 55;
	float toxicity = 0.3;
	float digestibility = 2;
	float agents = 16;
}

class DZSMMedicineDumpEntry : Managed
{
	float prevention = 0.75;
	float treatment = 0.5;
	float diseaseExit = 0;
}

class DZSMItemDumpEntry : DZSMBaseDumpEntry
{
	bool isMeleeWeapon;

	int repairKitType;
	
	ref DZSMNutritionDumpEntry nutrition;
	ref DZSMMedicineDumpEntry medicine;

	ref TIntArray cargoSize;
	
	ref TStringArray attachments;

	ref TFloatArray recoilModifier;
	ref TFloatArray swayModifier;
	float noiseShootModifier;
	float dispersionModifier;

	float opticsDistanceZoomMin;
	float opticsDistanceZoomMax;
	ref TFloatArray opticsDiscreteDistance;
	
	float meleeDmg;
	float meleeDmgHeavy;
	
	void DZSMItemDumpEntry(string classnameParam)
	{
		Init(classnameParam, "cfgVehicles");

		isMeleeWeapon = GetGame().ConfigGetInt( "cfgVehicles " + classname + " isMeleeWeapon" ) == 1;
		repairKitType = GetGame().ConfigGetInt( "cfgVehicles " + classname + " repairKitType" );

		cargoSize = new TIntArray;
		GetGame().ConfigGetIntArray( "cfgVehicles " + classname + " itemscargoSize", cargoSize);
	
		attachments = new TStringArray;
		GetGame().ConfigGetTextArray( "cfgVehicles " + classname + " attachments", attachments);

		recoilModifier = new TFloatArray;
		GetGame().ConfigGetFloatArray( "cfgVehicles " + classname + " recoilModifier", recoilModifier);
		swayModifier = new TFloatArray;
		GetGame().ConfigGetFloatArray( "cfgVehicles " + classname + " swayModifier", swayModifier);
		noiseShootModifier = GetGame().ConfigGetFloat( "cfgVehicles " + classname + " noiseShootModifier");
		dispersionModifier = GetGame().ConfigGetFloat( "cfgVehicles " + classname + " dispersionModifier");
		
		if (GetGame().ConfigIsExisting( "cfgVehicles " + classname + " OpticsInfo distanceZoomMin" ))
		{
			opticsDistanceZoomMin = GetGame().ConfigGetFloat( "cfgVehicles " + classname + " OpticsInfo distanceZoomMin" );
			opticsDistanceZoomMax = GetGame().ConfigGetFloat( "cfgVehicles " + classname + " OpticsInfo distanceZoomMax" );
			opticsDiscreteDistance = new TFloatArray;
			GetGame().ConfigGetFloatArray( "cfgVehicles " + classname + " OpticsInfo discreteDistance", opticsDiscreteDistance );
		}

		if (GetGame().ConfigIsExisting("cfgVehicles " + classname + " Nutrition fullnessIndex"))
		{
			nutrition = new DZSMNutritionDumpEntry;
			nutrition.fullnessIndex = GetGame().ConfigGetFloat( "cfgVehicles " + classname + " Nutrition fullnessIndex" );
			nutrition.energy = GetGame().ConfigGetFloat( "cfgVehicles " + classname + " Nutrition energy" );
			nutrition.water = GetGame().ConfigGetFloat( "cfgVehicles " + classname + " Nutrition water" );
			nutrition.nutritionalIndex = GetGame().ConfigGetFloat( "cfgVehicles " + classname + " Nutrition nutritionalIndex" );
			nutrition.toxicity = GetGame().ConfigGetFloat( "cfgVehicles " + classname + " Nutrition toxicity" );
			nutrition.digestibility = GetGame().ConfigGetFloat( "cfgVehicles " + classname + " Nutrition digestibility" );
			nutrition.agents = GetGame().ConfigGetFloat( "cfgVehicles " + classname + " Nutrition agents" );
		}

		if (GetGame().ConfigIsExisting("cfgVehicles " + classname + " Medicine prevention"))
		{
			medicine = new DZSMMedicineDumpEntry;
			medicine.prevention = GetGame().ConfigGetFloat( "cfgVehicles " + classname + " Medicine prevention" );
			medicine.treatment = GetGame().ConfigGetFloat( "cfgVehicles " + classname + " Medicine treatment" );
			medicine.diseaseExit = GetGame().ConfigGetFloat( "cfgVehicles " + classname + " Medicine diseaseExit" );
		}

		if (GetGame().ConfigIsExisting("cfgVehicles " + classname + " MeleeModes"))
		{
			string meleeAmmo = GetGame().ConfigGetTextOut( "cfgVehicles " + classname + " MeleeModes Default ammo" );
			string meleeAmmoHeavy = GetGame().ConfigGetTextOut( "cfgVehicles " + classname + " MeleeModes Heavy ammo" );

			meleeDmg = GetGame().ConfigGetFloat( "cfgAmmo " + meleeAmmo + " DamageApplied Health damage" );
			meleeDmgHeavy = GetGame().ConfigGetFloat( "cfgAmmo " + meleeDmgHeavy + " DamageApplied Health damage" );
		}
	}

	void ~DZSMItemDumpEntry()
	{
		if (nutrition)
		{
			delete nutrition;
		}
		if (medicine)
		{
			delete medicine;
		}
		if (cargoSize)
		{
			delete cargoSize;
		}
		if (attachments)
		{
			delete attachments;
		}
		if (recoilModifier)
		{
			delete recoilModifier;
		}
		if (swayModifier)
		{
			delete swayModifier;
		}
		if (opticsDiscreteDistance)
		{
			delete opticsDiscreteDistance;
		}
	}
}

static void DZSMItemDump()
{
	string filepath = "$profile:dzsm-itemdump.json";
	if (FileExist(filepath))
	{
		return;
	}

	array<ref DZSMItemDumpEntry> list = new array<ref DZSMItemDumpEntry>;
    int nClasses = GetGame().ConfigGetChildrenCount( "cfgVehicles" );
    for ( int nClass = 0; nClass < nClasses; ++nClass )
	{
    	string className;
    	GetGame().ConfigGetChildName( "cfgVehicles", nClass, className );
		if (GetGame().IsKindOf(className, "Inventory_Base") && !GetGame().IsKindOf(className, "Clothing") && GetGame().ConfigGetInt( "cfgVehicles " + className + " scope" ) == 2) {
			list.Insert(new DZSMItemDumpEntry(className));
		}
    }
	JsonFileLoader<array<ref DZSMItemDumpEntry>>.JsonSaveFile(filepath, list);
}

class DZSMContainerDumpEntry : DZSMBaseDumpEntry
{

	int canBeDigged;
	int heavyItem;
	ref TIntArray cargoSize;
	
	ref TStringArray attachments;
	
	void DZSMContainerDumpEntry(string classnameParam)
	{
		Init(classnameParam, "cfgVehicles");

		canBeDigged = GetGame().ConfigGetInt( "cfgVehicles " + classname + " canBeDigged" );
		heavyItem = GetGame().ConfigGetInt( "cfgVehicles " + classname + " heavyItem" );

		cargoSize = new TIntArray;
		if (GetGame().ConfigIsExisting( "cfgVehicles " + classname + " Cargo itemscargoSize" ))
		{
			GetGame().ConfigGetIntArray( "cfgVehicles " + classname + " Cargo itemscargoSize", cargoSize);
		}
		else
		{
			GetGame().ConfigGetIntArray( "cfgVehicles " + classname + " itemscargoSize", cargoSize);
		}
	
		attachments = new TStringArray;
		GetGame().ConfigGetTextArray( "cfgVehicles " + classname + " attachments", attachments);
	}

	void ~DZSMContainerDumpEntry()
	{
		if (cargoSize)
		{
			delete cargoSize;
		}
		if (attachments)
		{
			delete attachments;
		}
	}
}

static void DZSMContainerDump()
{
	string filepath = "$profile:dzsm-containerdump.json";
	if (FileExist(filepath))
	{
		return;
	}

	array<ref DZSMContainerDumpEntry> list = new array<ref DZSMContainerDumpEntry>;
    int nClasses = GetGame().ConfigGetChildrenCount( "cfgVehicles" );
    for ( int nClass = 0; nClass < nClasses; ++nClass )
	{
    	string className;
    	GetGame().ConfigGetChildName( "cfgVehicles", nClass, className );
		if (GetGame().IsKindOf(className, "Container_Base") && GetGame().ConfigGetInt( "cfgVehicles " + className + " scope" ) == 2) {
			list.Insert(new DZSMContainerDumpEntry(className));
		}
    }
	JsonFileLoader<array<ref DZSMContainerDumpEntry>>.JsonSaveFile(filepath, list);
}

class DZSMZombieDumpEntry : DZSMDumpEntry
{
	
	void DZSMZombieDumpEntry(string classnameParam)
	{
		Init(classnameParam, "cfgVehicles");

	}

	void ~DZSMZombieDumpEntry()
	{
		
	}
}

static void DZSMZombieDump()
{
	string filepath = "$profile:dzsm-zombiedump.json";
	if (FileExist(filepath))
	{
		return;
	}

	array<ref DZSMZombieDumpEntry> list = new array<ref DZSMZombieDumpEntry>;
    int nClasses = GetGame().ConfigGetChildrenCount( "cfgVehicles" );
    for ( int nClass = 0; nClass < nClasses; ++nClass )
	{
    	string className;
    	GetGame().ConfigGetChildName( "cfgVehicles", nClass, className );
		if (GetGame().IsKindOf(className, "ZombieBase") && GetGame().ConfigGetInt( "cfgVehicles " + className + " scope" ) == 2) {
			list.Insert(new DZSMZombieDumpEntry(className));
		}
    }
	JsonFileLoader<array<ref DZSMZombieDumpEntry>>.JsonSaveFile(filepath, list);
}

class ServerManagerCallback: RestCallback
{	
	override void OnSuccess(string data, int dataSize)
	{
		#ifdef DZSM_DEBUG
		Print("DZSM ~ OnSuccess Data: " + data);
		#endif
	}
	
	override void OnError(int errorCode)
	{
		Print("DZSM ~ OnError: " + errorCode);
	}
	
	override void OnTimeout()
	{
		Print("DZSM ~ OnTimeout");
	}
};

class ServerManagerEntry
{
	string entryType;
	string type;
	string category;
	string name;
	int id;
	string id2;
	string position;	
	string speed;
	float damage;
}


class ServerManagerEntryContainer
{
	ref array<ref ServerManagerEntry> players = new array<ref ServerManagerEntry>;
	ref array<ref ServerManagerEntry> vehicles = new array<ref ServerManagerEntry>;

	void ServerManagerEntryContainer()
	{
	}

	void ~ServerManagerEntryContainer()
	{
		int i = 0;
		for (i = 0; i < players.Count(); i++)
		{
			delete players.Get(i);
		}
		delete players;

		for (i = 0; i < vehicles.Count(); i++)
		{
			delete vehicles.Get(i);
		}
		delete vehicles;
	}

}

class DayZServerManagerWatcher
{
    private ref Timer m_Timer;
	private ref Timer m_InitTimer;

	private ref JsonSerializer m_jsonSerializer = new JsonSerializer;
	
	private RestApi m_RestApi;
    private RestContext m_RestContext;

    void DayZServerManagerWatcher()
    {
		Print("DZSM ~ DayZServerManagerWatcher()");

        m_InitTimer = new Timer(CALL_CATEGORY_GAMEPLAY);
		m_InitTimer.Run(2.0 * 60.0, this, "init", null, false);
    }

	void init()
	{
		Print("DZSM ~ DayZServerManagerWatcher() - INIT");

		m_RestApi = CreateRestApi();
        m_RestContext = m_RestApi.GetRestContext(GetDZSMApiOptions().host);
		m_RestContext.SetHeader("application/json");
        m_RestApi.EnableDebug(false);
		
		StartLoop();
		
		Print("DZSM ~ DayZServerManagerWatcher() - INIT DONE");

		if (GetDZSMApiOptions().dataDump)
		{
			Print("DZSM ~ DayZServerManagerWatcher() - DATA DUMP");
			
			Print("DZSM ~ DayZServerManagerWatcher() - AMMO DUMP");
			DZSMAmmoDump();

			Print("DZSM ~ DayZServerManagerWatcher() - MAG DUMP");
			DZSMMagDump();

			Print("DZSM ~ DayZServerManagerWatcher() - WEAPON DUMP");
			DZSMWeaponDump();

			Print("DZSM ~ DayZServerManagerWatcher() - CLOTHING DUMP");
			DZSMClothingDump();

			Print("DZSM ~ DayZServerManagerWatcher() - ITEM DUMP");
			DZSMItemDump();
			
			Print("DZSM ~ DayZServerManagerWatcher() - CONTAINER DUMP");
			DZSMContainerDump();

			Print("DZSM ~ DayZServerManagerWatcher() - ZOMBIE DUMP");
			DZSMZombieDump();

			Print("DZSM ~ DayZServerManagerWatcher() - DATA DUMP DONE");
		}

		CrashTest();
	}

	void CrashTest()
	{
		string crashCheckItemsPath = "$profile:itemsforcrashcheck.json";
		if (!FileExist(crashCheckItemsPath))
		{
			return;
		}
		ref array<string> crashCheckItems = new array<string>;
		JsonFileLoader<array<string>>.JsonLoadFile(crashCheckItemsPath, crashCheckItems);
		
		Print("DZSM ~ DayZServerManagerWatcher() - STARTING CRASH TEST");

		string crashingItemsPath = "$profile:crashingitems.json";
		ref array<string> crashingItems = new array<string>;

		if (!FileExist(crashingItemsPath))
		{
			for (int i = 0; i < DZSMWeaponDumpEntry.m_ItemsThatCrash.Count(); i++)
			{
				string knownCrashItem = DZSMWeaponDumpEntry.m_ItemsThatCrash[i];
				knownCrashItem.ToLower();
				crashingItems.Insert(knownCrashItem);
			}
			JsonFileLoader<array<string>>.JsonSaveFile(crashingItemsPath, crashingItems); 
		}
		else
		{
			JsonFileLoader<array<string>>.JsonLoadFile(crashingItemsPath, crashingItems);
		}

		int totalRuns = crashCheckItems.Count();
		for (int x = 0; x < totalRuns; x++)
		{
			// remove from queue and save
			string itemToTest = crashCheckItems.Get(0);
			itemToTest.ToLower();
			crashCheckItems.Remove(0);
			JsonFileLoader<array<string>>.JsonSaveFile(crashCheckItemsPath, crashCheckItems);

			Print("Check for crash: " + itemToTest);

			// check if not already known to crash
			bool knownToCrash = false;
			for (int j = 0; j < crashingItems.Count(); j++)
			{
				if ( crashingItems[j] == itemToTest )
				{
					knownToCrash = true;
					break;
				}
			}
			if (knownToCrash)
			{
				Print("Item already known to crash: " + itemToTest);
				continue;
			}

			// insert and save
			crashingItems.Insert(itemToTest);
			JsonFileLoader<array<string>>.JsonSaveFile(crashingItemsPath, crashingItems);
			
			// test
			EntityAI ent;
			if ( !Class.CastTo( ent, GetGame().CreateObjectEx( itemToTest, "0 0 0", ECE_NONE ) ) )
			{
				Print("Failed to create item to check for crash: " + itemToTest);
			}
			else {

				Print("Item crash check completed successfully: " + itemToTest);
				GetGame().ObjectDelete( ent );
				// at this point its propbably safe.. so remove it again and save
				crashingItems.Remove(crashingItems.Count() - 1);
				JsonFileLoader<array<string>>.JsonSaveFile(crashingItemsPath, crashingItems);
			}
			
		}

		Print("DZSM ~ DayZServerManagerWatcher() - CRASH TEST DONE");
	}

    float GetInterval()
	{
		return GetDZSMApiOptions().reportInterval;
	}

    void StartLoop()
	{
		if (!m_Timer)
		{
			m_Timer = new Timer(CALL_CATEGORY_GAMEPLAY);
		}
		
		m_Timer.Run(GetInterval(), this, "Tick", null, true);
	}
	
	void StopLoop()
	{
		if (m_Timer)
		{
			m_Timer.Stop();
		}
	}

	void Tick()
	{
		#ifdef DZSM_DEBUG
		Print("DZSM ~ TICK");
		#endif
		int i;
		
		ref ServerManagerEntryContainer container = new ServerManagerEntryContainer;
		
		array<EntityAI> allVehicles;
		DayZServerManagerContainer.GetVehicles(allVehicles);
		if (allVehicles)
		{
			for (i = 0; i < allVehicles.Count(); i++)
			{
				EntityAI itrCar = allVehicles.Get(i);
				if (itrCar)
				{
					ref ServerManagerEntry entry = new ServerManagerEntry();
					
					entry.entryType = "VEHICLE";
					
					if (itrCar.IsKindOf("ExpansionHelicopterScript"))
					{
						entry.category = "AIR";
					}
					else if (itrCar.IsKindOf("ExpansionBoatScript"))
					{
						entry.category = "SEA";
					}
					else
					{
						entry.category = "GROUND";
					}
					
					entry.name = itrCar.GetName();
					entry.damage = itrCar.GetDamage();
					entry.type = itrCar.GetType();
					entry.id = itrCar.GetID();
					entry.speed = itrCar.GetSpeed().ToString(false);
					entry.position = itrCar.GetPosition().ToString(false);
					
					container.vehicles.Insert(entry);
				}
				
			}
		}
		
		array<Man> players = new array<Man>();
		GetGame().GetPlayers(players);
		if (players)
		{
			for (i = 0; i < players.Count(); i++)
			{
				Man player = players.Get(i);
				
				ref ServerManagerEntry playerEntry = new ServerManagerEntry();
				
				playerEntry.entryType = "PLAYER";
				playerEntry.category = "MAN";

				playerEntry.name = player.GetIdentity().GetName();
				// player.GetDisplayName();
				playerEntry.damage = player.GetDamage();
				playerEntry.type = player.GetType();
				playerEntry.id = player.GetID();
				playerEntry.id2 = player.GetIdentity().GetPlainId();
				playerEntry.speed = player.GetSpeed().ToString(false);
				playerEntry.position = player.GetPosition().ToString(false);

				container.players.Insert(playerEntry);
			}
		}

		DZSMApiOptions apiOptions = GetDZSMApiOptions();
		if (apiOptions.useApiForReport)
		{
			#ifdef DZSM_DEBUG
			Print("DZSM ~ API TICK");
			#endif

			// RestContext restContext = GetRestApi().GetRestContext(apiOptions.host);
			// restContext.SetHeader("application/json");
			// restContext.POST_now("/ingamereport?key=" + apiOptions.key, JsonFileLoader<ref ServerManagerEntryContainer>.JsonMakeData(container));
			m_RestContext.POST(new ServerManagerCallback(), string.Format("/ingamereport?key=%1", apiOptions.key), JsonFileLoader<ref ServerManagerEntryContainer>.JsonMakeData(container));
		}
		else
		{
			JsonFileLoader<ref ServerManagerEntryContainer>.JsonSaveFile("$profile:DZSM-TICK.json", container);
		}

		#ifdef DZSM_DEBUG
		Print("DZSM ~ Cleanup");
		#endif
		delete container;
		#ifdef DZSM_DEBUG
		Print("DZSM ~ Cleanup Done");
		#endif
	}

}

modded class MissionServer
{
    private ref DayZServerManagerWatcher m_dayZServerManagerWatcher;

    void MissionServer()
    {
		Print("DZSM ~ MissionServer");
    }

	override void OnInit()
	{
		super.OnInit();
		
		Print("DZSM ~ MissionServer.OnInit");
	}

	override void OnMissionStart()
	{
		super.OnMissionStart();
		Print("DZSM ~ MissionServer.OnMissionStart");

		if (!GetGame().IsClient())
		{
        	m_dayZServerManagerWatcher = new DayZServerManagerWatcher();
		}
	}
};