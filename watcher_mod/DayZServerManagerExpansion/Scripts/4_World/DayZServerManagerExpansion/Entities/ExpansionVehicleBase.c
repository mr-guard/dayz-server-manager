modded class ExpansionVehicleBase
{
    void ExpansionVehicleBase()
	{
		DayZServerManagerContainer.registerVehicle(this);
	}

    void ~ExpansionVehicleBase()
	{
		DayZServerManagerContainer.unregisterVehicle(this);
    }
}