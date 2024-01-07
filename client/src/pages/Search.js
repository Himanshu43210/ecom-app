import React, { useEffect } from "react";
import Layout from "./../components/Layout/Layout";
import { useSearch } from "../context/search";
import axios from "axios";
import { useLocation } from "react-router-dom";

const Search = () => {
  const [values, setValues] = useSearch();
  const location = useLocation();

  useEffect(() => {
    const getQueryParam = (param) => {
      const searchParams = new URLSearchParams(location.search);
      return searchParams.get(param);
    };
    const fetchData = async () => {
      try {
        // Get the value of the 'title' query parameter from the URL
        const titleFromUrl = getQueryParam("title");

        // If the title is present in the URL, make the API call
        if (titleFromUrl) {
          const { data } = await axios.get(
            "https://ecom-app-cyaw.onrender.com" +
            `/api/v1/product/search/${titleFromUrl}`
          );

          // Update state with the keyword and results
          setValues({ keyword: titleFromUrl, results: data });
        }
      } catch (error) {
        console.log(error);
      }
    };
    if (location.search) {
      fetchData(); // Call the fetchData function when the component mounts
    }
  }, [location.search, setValues]);

  return (
    <Layout title={"Search results"}>
      {
        console.log(values)
      }
      <div className="container">
        <div className="text-center">
          <h1>Search Resuts</h1>
          <h6>
            {values?.results.length < 1
              ? "No Products Found"
              : `Found ${values?.results.length}`}
          </h6>
          <div className="d-flex flex-wrap mt-4">
            {values?.results.map((p) => (
              <div className="card m-2" style={{ width: "18rem" }}>
                <img
                  src={`/api/v1/product/product-photo/${p._id}`}
                  className="card-img-top"
                  alt={p.name}
                />
                <div className="card-body">
                  <h5 className="card-title">{p.name}</h5>
                  <p className="card-text">
                    {p.description.substring(0, 30)}...
                  </p>
                  <p className="card-text"> $ {p.price}</p>
                  <button class="btn btn-primary ms-1">More Details</button>
                  <button class="btn btn-secondary ms-1">ADD TO CART</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Search;
