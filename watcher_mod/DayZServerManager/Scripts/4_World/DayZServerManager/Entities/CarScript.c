modded class CarScript
{
	void CarScript()
	{
		DayZServerManagerContainer.registerVehicle(this);
	}

    void ~CarScript()
	{
		DayZServerManagerContainer.unregisterVehicle(this);
    }
}
