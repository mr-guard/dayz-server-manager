class DZSMApiOptions
{
	string host = "localhost:2312";
	string key = "invalid-key";
	bool useApiForReport = false;
	float reportInterval = 30.0;
	bool dataDump = false;
};

static ref DZSMApiOptions m_dzsmApiOptions = null;
static ref JsonSerializer m_dzsmApiOptionsDeserializer = new JsonSerializer;
ref DZSMApiOptions GetDZSMApiOptions()
{	
	if (!m_dzsmApiOptions)
	{
		string jsonConfigPath = "$profile:\\DZSMApiOptions.json";
		if (FileExist(jsonConfigPath))
		{
			#ifdef DZSM_DEBUG
			Print("DZSM ~ Loading API Config");
			#endif
			JsonFileLoader<ref DZSMApiOptions>.JsonLoadFile(jsonConfigPath, m_dzsmApiOptions);
		}
		else
		{
			m_dzsmApiOptions = new DZSMApiOptions();
		}
	}

	if (!GetRestApi())
	{
		CreateRestApi();
	}

	return m_dzsmApiOptions;
}
